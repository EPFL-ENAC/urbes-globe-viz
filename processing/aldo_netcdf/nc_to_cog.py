#!/usr/bin/env python3
"""
Convert WRF/PALM NetCDF files to Cloud Optimized GeoTIFF (COG) with time-series support.

Each timestep becomes a separate band in the output COG.
Handles both WRF curvilinear grids (GCPs from XLONG/XLAT) and
PALM local grids (affine geotransform from origin_x/origin_y in EPSG:2056).

Usage:
    # WRF (auto-detects curvilinear grid):
    uv run nc_to_cog.py -i wrfout_d03_2022-07-15_12_00_00 -v T2 -o t2_cog.tif

    # PALM (auto-detects local grid with origin attrs, --z-level picks height):
    uv run nc_to_cog.py -i TEST_4_3d.001-001.nc -v ta --z-level 3 -o ta_cog.tif
"""

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

try:
    import netCDF4 as nc
    import numpy as np
except ImportError:
    print("Missing dependencies. Run: uv add netcdf4 numpy")
    raise


def get_netcdf_info(input_path: str) -> dict:
    """Inspect a NetCDF file and return dimension/variable/coordinate info."""
    ds = nc.Dataset(input_path)

    lon_var = lat_var = time_var = None
    for var_name in ds.variables:
        var_lower = var_name.lower()
        if var_lower in ("xlong", "lon", "longitudes", "longitude", "x"):
            lon_var = var_name
        elif var_lower in ("xlat", "lat", "latitudes", "latitude", "y"):
            lat_var = var_name
        elif var_lower in ("time", "times"):
            time_var = var_name

    dims = {dim_name: len(dim_obj) for dim_name, dim_obj in ds.dimensions.items()}
    variables = list(ds.variables.keys())
    ds.close()

    return {
        "dimensions": dims,
        "variables": variables,
        "lon_var": lon_var,
        "lat_var": lat_var,
        "time_var": time_var,
    }


def _detect_grid_type(ds: nc.Dataset) -> str:
    """Detect whether the NetCDF uses WRF curvilinear or PALM local coordinates."""
    # WRF: has 2D XLONG/XLAT arrays
    for v_name in ("XLONG", "XLONG_U", "XLONG_V"):
        if v_name in ds.variables:
            return "wrf"

    # PALM: has origin_x/origin_y global attrs + 1D x/y arrays
    if hasattr(ds, "origin_x") and hasattr(ds, "origin_y"):
        if "x" in ds.variables and "y" in ds.variables:
            return "palm"

    # Fallback: regular grid with lon/lat 1D arrays
    return "regular"


def _find_wrf_coordinates(ds: nc.Dataset) -> tuple[np.ndarray, np.ndarray]:
    """Extract 2D lon/lat arrays from WRF dataset."""
    for v_name in ("XLONG", "XLONG_U", "XLONG_V"):
        if v_name in ds.variables:
            data = ds.variables[v_name][:]
            if data.ndim == 3:
                data = data[0]
            lon_2d = data
            lat_name = v_name.replace("LONG", "LAT")
            if lat_name in ds.variables:
                lat_data = ds.variables[lat_name][:]
                if lat_data.ndim == 3:
                    lat_data = lat_data[0]
                return lon_2d, lat_data
    raise ValueError("Could not find XLONG/XLAT coordinate arrays")


def _get_palm_geotransform(ds: nc.Dataset) -> tuple[float, float, float, float, str]:
    """Compute GDAL geotransform for PALM local grid.

    Returns (origin_x_gdal, origin_y_gdal, dx, dy, srs) where
    origin is top-left corner of the raster in EPSG:2056.
    """
    origin_x = float(ds.origin_x)
    origin_y = float(ds.origin_y)
    x = ds.variables["x"][:]
    y = ds.variables["y"][:]
    dx = float(x[1] - x[0]) if len(x) > 1 else 1.0
    dy = float(y[1] - y[0]) if len(y) > 1 else 1.0

    # x/y are cell centers in local meters offset from origin.
    # Top-left corner = origin + first cell center - half cell size
    # GDAL convention: origin is top-left, y goes downward (negative dy)
    top_left_x = origin_x + float(x[0]) - dx / 2
    top_left_y = origin_y + float(y[-1]) + dy / 2  # top = max y + half cell

    return top_left_x, top_left_y, dx, dy, "EPSG:2056"


def _extract_timestep(var_data, t: int, z_level: int | None = None) -> np.ndarray:
    """Extract a 2D slice from a variable at timestep t.

    For 4D data (time, z, y, x), uses z_level if provided, else level 0.
    """
    shape = var_data.shape
    if len(shape) == 4:
        # (time, z, y, x)
        z = z_level if z_level is not None else 0
        data = var_data[t, z, :, :]
    elif len(shape) == 3:
        # (time, y, x)
        data = var_data[t, :, :]
    else:
        data = var_data[t]

    if hasattr(data, "mask"):
        data = np.ma.filled(data, fill_value=np.nan)

    return np.asarray(data, dtype=np.float32)


def _run_cmd(cmd: list[str], label: str):
    """Run a subprocess command, raising on failure."""
    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed:\n{result.stderr}")
    if result.stdout.strip():
        for line in result.stdout.strip().split("\n")[:5]:
            print(f"    {line}")


def _write_wrf_geotiff(
    data: np.ndarray,
    lon_2d: np.ndarray,
    lat_2d: np.ndarray,
    output_path: Path,
    gcp_step: int = 10,
):
    """Write a single-band GeoTIFF with GCPs for WRF curvilinear grids."""
    height, width = data.shape

    bil_path = output_path.with_suffix(".bil")
    hdr_path = output_path.with_suffix(".hdr")
    data.astype("<f4").tofile(bil_path)
    hdr_path.write_text(
        f"NROWS {height}\n"
        f"NCOLS {width}\n"
        f"NBANDS 1\n"
        f"NBITS 32\n"
        f"PIXELTYPE FLOAT\n"
        f"BYTEORDER I\n"
        f"LAYOUT BIL\n"
    )

    gcps = []
    for row in range(0, height, gcp_step):
        for col in range(0, width, gcp_step):
            lon = float(lon_2d[row, col])
            lat = float(lat_2d[row, col])
            gcps.append(f"-gcp {col + 0.5} {row + 0.5} {lon} {lat}")
    for row, col in [(0, 0), (0, width - 1), (height - 1, 0), (height - 1, width - 1)]:
        lon = float(lon_2d[row, col])
        lat = float(lat_2d[row, col])
        gcps.append(f"-gcp {col + 0.5} {row + 0.5} {lon} {lat}")

    cmd = [
        "gdal_translate",
        "-of", "GTiff",
        "-a_srs", "EPSG:4326",
    ]
    for gcp in gcps:
        cmd.extend(gcp.split())
    cmd.extend([str(bil_path), str(output_path)])
    _run_cmd(cmd, "gdal_translate (GCP embedding)")

    bil_path.unlink(missing_ok=True)
    hdr_path.unlink(missing_ok=True)


def _write_palm_geotiff(
    data: np.ndarray,
    geotransform: tuple[float, float, float, float, str],
    output_path: Path,
):
    """Write a single-band GeoTIFF with affine geotransform for PALM grids."""
    height, width = data.shape
    top_left_x, top_left_y, dx, dy, srs = geotransform

    bil_path = output_path.with_suffix(".bil")
    hdr_path = output_path.with_suffix(".hdr")

    # PALM y-axis goes from south to north, but raster convention is top-to-bottom.
    # Flip the data so row 0 = northernmost.
    data_flipped = np.flipud(data)
    data_flipped.astype("<f4").tofile(bil_path)
    hdr_path.write_text(
        f"NROWS {height}\n"
        f"NCOLS {width}\n"
        f"NBANDS 1\n"
        f"NBITS 32\n"
        f"PIXELTYPE FLOAT\n"
        f"BYTEORDER I\n"
        f"LAYOUT BIL\n"
        f"ULXMAP {top_left_x + dx / 2}\n"
        f"ULYMAP {top_left_y - dy / 2}\n"
        f"XDIM {dx}\n"
        f"YDIM {dy}\n"
    )

    cmd = [
        "gdal_translate",
        "-of", "GTiff",
        "-a_srs", srs,
        str(bil_path), str(output_path),
    ]
    _run_cmd(cmd, "gdal_translate (PALM geotransform)")

    bil_path.unlink(missing_ok=True)
    hdr_path.unlink(missing_ok=True)


def extract_variable_to_cog(
    input_path: str,
    variable: str,
    output_path: str,
    z_level: int | None = None,
    resampling: str = "bilinear",
    compress: str = "DEFLATE",
):
    """Extract a variable from NetCDF and create a multi-band COG (one band per timestep)."""
    ds = nc.Dataset(input_path)

    # Detect grid type
    grid_type = _detect_grid_type(ds)
    print(f"  Grid type: {grid_type}")

    # Find variable (case-insensitive)
    var_name = next((v for v in ds.variables if v.lower() == variable.lower()), None)
    if var_name is None:
        available = [v for v in ds.variables.keys()]
        ds.close()
        raise ValueError(f"Variable '{variable}' not found. Available: {available}")

    var_data = ds.variables[var_name]

    # Find time dimension
    time_dim = None
    for dim_name in var_data.dimensions:
        if dim_name.lower().startswith("time") or dim_name == "Time":
            time_dim = dim_name
            break
    if time_dim is None:
        ds.close()
        raise ValueError(f"No time dimension found in variable '{var_name}'")

    num_timesteps = len(ds.dimensions[time_dim])

    # Report z-level usage for 4D data
    if len(var_data.shape) == 4:
        z_idx = z_level if z_level is not None else 0
        z_dim_name = var_data.dimensions[1]
        if z_dim_name in ds.variables:
            z_values = ds.variables[z_dim_name][:]
            z_height = float(z_values[z_idx])
            print(f"  Z-level: index {z_idx} = {z_height:.2f}m ({z_dim_name})")
        else:
            print(f"  Z-level: index {z_idx} ({z_dim_name})")

    print(f"  Variable: {var_name}, shape: {var_data.shape}, timesteps: {num_timesteps}")

    # Set up grid-specific coordinate info
    if grid_type == "wrf":
        lon_2d, lat_2d = _find_wrf_coordinates(ds)
        print(f"  Grid size: {lat_2d.shape[0]} x {lon_2d.shape[1]}")
        print(f"  Lon range: [{float(lon_2d.min()):.4f}, {float(lon_2d.max()):.4f}]")
        print(f"  Lat range: [{float(lat_2d.min()):.4f}, {float(lat_2d.max()):.4f}]")
        palm_gt = None
    elif grid_type == "palm":
        palm_gt = _get_palm_geotransform(ds)
        x = ds.variables["x"][:]
        y = ds.variables["y"][:]
        print(f"  Grid size: {len(y)} x {len(x)}, resolution: {palm_gt[2]:.2f}m")
        print(f"  Origin (LV95): E={palm_gt[0]:.2f}, N={palm_gt[1]:.2f}")
        lon_2d = lat_2d = None
    else:
        raise ValueError(f"Unsupported grid type: {grid_type}")

    temp_dir = Path(tempfile.mkdtemp(prefix="nc_to_cog_"))

    resampling_map = {
        "nearest": "near",
        "average": "average",
        "bilinear": "bilinear",
        "cubic": "cubic",
    }

    try:
        warped_tifs = []
        for t in range(num_timesteps):
            print(f"  Extracting timestep {t + 1}/{num_timesteps}")
            data = _extract_timestep(var_data, t, z_level)
            raw_tif = temp_dir / f"band_{t:04d}_raw.tif"

            if grid_type == "wrf":
                _write_wrf_geotiff(data, lon_2d, lat_2d, raw_tif)
                src_srs = None  # GCPs already embed EPSG:4326
            elif grid_type == "palm":
                _write_palm_geotiff(data, palm_gt, raw_tif)
                src_srs = "EPSG:2056"

            # Warp to EPSG:3857
            warped_tif = temp_dir / f"band_{t:04d}_3857.tif"
            cmd = [
                "gdalwarp",
                str(raw_tif),
                str(warped_tif),
                "-t_srs", "EPSG:3857",
                "-r", resampling_map.get(resampling, "bilinear"),
                "-dstnodata", "nan",
            ]
            if src_srs:
                cmd.extend(["-s_srs", src_srs])
            _run_cmd(cmd, f"gdalwarp (timestep {t} to 3857)")
            warped_tifs.append(warped_tif)
            raw_tif.unlink(missing_ok=True)

        ds.close()

        # Stack all warped timesteps into a multi-band VRT
        stacked_vrt = temp_dir / "stacked.vrt"
        cmd = [
            "gdalbuildvrt",
            "-separate",
            str(stacked_vrt),
        ] + [str(p) for p in warped_tifs]
        _run_cmd(cmd, "gdalbuildvrt -separate")

        # Convert VRT to COG
        print("  Creating COG...")
        cmd = [
            "gdal_translate",
            str(stacked_vrt),
            output_path,
            "-of", "COG",
            "-co", f"COMPRESS={compress}",
            "-co", "LEVEL=6",
            "-co", "PREDICTOR=2",
            "-co", "BLOCKSIZE=256",
            "-co", "OVERVIEW_RESAMPLING=AVERAGE",
            "-co", "BIGTIFF=IF_SAFER",
            "--config", "GDAL_CACHEMAX", "4096",
            "--config", "GDAL_NUM_THREADS", "ALL_CPUS",
        ]
        _run_cmd(cmd, "gdal_translate (COG creation)")

        print(f"\n  COG created: {output_path}")

        # Verify
        result = subprocess.run(
            ["gdalinfo", output_path], capture_output=True, text=True
        )
        if result.returncode == 0:
            for line in result.stdout.split("\n")[:20]:
                print(f"    {line}")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description="Convert WRF/PALM NetCDF to multi-band COG (one band per timestep)"
    )
    parser.add_argument("--input", "-i", required=True, help="Input NetCDF file")
    parser.add_argument("--variable", "-v", required=True, help="Variable to extract")
    parser.add_argument("--output", "-o", required=True, help="Output COG file")
    parser.add_argument(
        "--z-level",
        type=int,
        default=None,
        help="Z-level index for 4D data (default: 0 for WRF, 3 (~1.25m) for PALM)",
    )
    parser.add_argument(
        "--resampling",
        "-r",
        default="bilinear",
        choices=["nearest", "average", "bilinear", "cubic"],
    )
    parser.add_argument(
        "--compress",
        "-c",
        default="DEFLATE",
        choices=["DEFLATE", "LZW", "JPEG", "WEBP"],
    )

    args = parser.parse_args()

    if not Path(args.input).exists():
        raise FileNotFoundError(f"Input file not found: {args.input}")

    print(f"Analyzing {args.input}...")
    info = get_netcdf_info(args.input)
    print(f"  Dimensions: {info['dimensions']}")
    print(f"  Variables: {info['variables'][:20]}")

    # Auto-detect z-level default for PALM if not specified
    z_level = args.z_level
    if z_level is None:
        ds = nc.Dataset(args.input)
        if _detect_grid_type(ds) == "palm":
            z_level = 3  # ~1.25m, pedestrian height
            print(f"  PALM detected: using default z-level {z_level} (~1.25m)")
        ds.close()

    print(f"\nExtracting variable '{args.variable}'...")
    extract_variable_to_cog(
        args.input,
        args.variable,
        args.output,
        z_level=z_level,
        resampling=args.resampling,
        compress=args.compress,
    )

    print("\nDone!")


if __name__ == "__main__":
    main()
