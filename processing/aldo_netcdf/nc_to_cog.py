#!/usr/bin/env python3
"""
Convert WRF/PALM NetCDF files to Cloud Optimized GeoTIFF (COG) with time-series support.

Usage:
    uv run nc_to_cog.py --input wrfout_d03_2022-07-15_12_00_00 --variable T2 --output t2_cog.tif
"""

import argparse
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
    ds = nc.Dataset(input_path)

    lon_var = lat_var = time_var = None
    for var_name in ds.variables:
        var_lower = var_name.lower()
        if var_lower in ["xlon", "lon", "longitudes", "longitude", "x"]:
            lon_var = var_name
        elif var_lower in ["xlat", "lat", "latitudes", "latitude", "y"]:
            lat_var = var_name
        elif var_lower in ["time", "times", "times"]:
            time_var = var_name

    dims = {dim_name: len(dim_obj) for dim_name, dim_obj in ds.dimensions.items()}
    variables = [v for v in ds.variables.keys() if not v.startswith("_")]
    ds.close()

    return {
        "dimensions": dims,
        "variables": variables,
        "lon_var": lon_var,
        "lat_var": lat_var,
        "time_var": time_var,
    }


def extract_variable_to_geotiff(
    input_path: str,
    variable: str,
    output_path: str,
    bounds: tuple = None,
    target_zoom: int = 14,
    resampling: str = "average",
    compress: str = "DEFLATE",
):
    ds = nc.Dataset(input_path)

    var_name = next((v for v in ds.variables if v.lower() == variable.lower()), None)
    if var_name is None:
        ds.close()
        raise ValueError(
            f"Variable '{variable}' not found. Available: {ds.variables.keys()}"
        )

    var_data = ds.variables[var_name]

    time_dim = None
    for dim_name in var_data.dimensions:
        if dim_name.lower().startswith("time") or dim_name == "Time":
            time_dim = dim_name
            break

    if time_dim is None:
        raise ValueError("Could not find time dimension")

    num_timesteps = len(ds.dimensions[time_dim])
    print(f"Found {num_timesteps} timesteps")

    lon_2d = lat_2d = None
    for v_name in ["XLONG", "XLONG_U", "XLONG_V", "XLAT", "XLAT_U", "XLAT_V"]:
        if v_name in ds.variables:
            lon_2d = ds.variables[v_name][:]
            lat_name = v_name.replace("LONG", "LAT")
            if lat_name in ds.variables:
                lat_2d = ds.variables[lat_name][:]
                break

    if lon_2d is None or lat_2d is None:
        # Try 1D coordinates (x/y for PALM, lon/lat for WRF)
        lon_1d = lat_1d = None
        for v_name in ds.variables:
            if v_name.lower() in ["x", "lon", "longitudes", "longitude"]:
                if len(ds.variables[v_name].dimensions) == 1:
                    lon_1d = ds.variables[v_name][:]
            elif v_name.lower() in ["y", "lat", "latitudes", "latitude"]:
                if len(ds.variables[v_name].dimensions) == 1:
                    lat_1d = ds.variables[v_name][:]

        if lon_1d is not None and lat_1d is not None:
            lon_2d, lat_2d = np.meshgrid(lon_1d, lat_1d)
        else:
            ds.close()
            raise ValueError(
                f"Could not extract coordinate arrays. Found lon_var={lon_2d is not None}, lat_var={lat_2d is not None}"
            )

    data_shape = var_data.shape
    temp_tiff = tempfile.mktemp(suffix=".tif")

    # Write intermediate GeoTIFF with numpy data, then use gdal_translate/gdalwarp
    height = lat_2d.shape[0]
    width = lon_2d.shape[1]
    min_lon, max_lon = float(lon_2d.min()), float(lon_2d.max())
    min_lat, max_lat = float(lat_2d.max()), float(lat_2d.min())
    pixel_width = (max_lon - min_lon) / width
    pixel_height = (max_lat - min_lat) / height

    # Write multi-band GeoTIFF using gdal_translate with VRT
    import shutil

    temp_dir = tempfile.mkdtemp()

    # Write each timestep as separate band to raw file
    raw_file = Path(temp_dir) / "data.raw"
    with open(raw_file, "wb") as f:
        for t in range(num_timesteps):
            print(f"  Processing timestep {t + 1}/{num_timesteps}")
            if len(data_shape) == 3:
                data = var_data[t, :, :]
            elif len(data_shape) == 4:
                data = var_data[t, 0, :, :]
            else:
                data = var_data[t]

            if hasattr(data, "mask"):
                data = np.ma.filled(data, fill_value=255)

            # Write as float32 binary
            data.flatten().astype("<f4").tofile(f)

    # Create VRT for multi-band raw data
    vrt_file = Path(temp_dir) / "data.vrt"
    bands_xml = "\n".join(
        [
            f'''<VRTRasterBand dataType="Float32" band="{i + 1}">
        <SimpleSource>
            <SourceFilename relativeToVRT="0">{raw_file}</SourceFilename>
            <SourceBand>1</SourceBand>
            <SourceProperties RasterXSize="{width}" RasterYSize="{height}" DataType="Float32"/>
            <SrcRect xOff="0" yOff="{i * height}" xSize="{width}" ySize="{height}"/>
            <DstRect xOff="0" yOff="0" xSize="{width}" ySize="{height}"/>
        </SimpleSource>
    </VRTRasterBand>'''
            for i in range(num_timesteps)
        ]
    )

    with open(vrt_file, "w") as f:
        f.write(f'''<VRTDataset rasterXSize="{width}" rasterYSize="{height}">
    <SRS>EPSG:4326</SRS>
    <GeoTransform>{min_lon}, {pixel_width}, 0, {max_lat}, 0, {-pixel_height}</GeoTransform>
    {bands_xml}
</VRTDataset>''')

    # Create intermediate GeoTIFF
    intermediate_tiff = Path(temp_dir) / "intermediate.tif"
    cmd = [
        "gdal_translate",
        "-of",
        "GTiff",
        "-ot",
        "Float32",
        "-a_srs",
        "EPSG:4326",
        "-a_ullr",
        str(min_lon),
        str(max_lat),
        str(max_lon),
        str(min_lat),
        str(vrt_file),
        str(intermediate_tiff),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        shutil.rmtree(temp_dir)
        raise RuntimeError(f"gdal_translate failed: {result.stderr}")

    shutil.rmtree(temp_dir)

    print("Reprojecting to EPSG:3857 and creating COG...")

    resampling_map = {
        "nearest": "near",
        "average": "average",
        "bilinear": "bilinear",
        "cubic": "cubic",
    }

    cmd = [
        "gdalwarp",
        temp_tiff,
        output_path,
        "-t_srs",
        "EPSG:3857",
        "-r",
        resampling_map.get(resampling, "average"),
        "-of",
        "COG",
        "-co",
        "BLOCKSIZE=256",
        "-co",
        f"COMPRESS={compress}",
        "-co",
        "LEVEL=6",
        "-co",
        "PREDICTOR=2",
        "-co",
        "TILING_SCHEME=GoogleMapsCompatible",
        f"-co ZOOM_LEVEL={target_zoom}",
        "-co",
        "OVERVIEW_RESAMPLING=AVERAGE",
        "-co",
        "SPARSE_OK=TRUE",
        "--config",
        "GDAL_CACHEMAX",
        "4096",
    ]

    if bounds:
        cmd.extend(
            [
                "-te_srs",
                "EPSG:4326",
                "-te",
                str(bounds[0]),
                str(bounds[1]),
                str(bounds[2]),
                str(bounds[3]),
            ]
        )

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"GDAL error: {result.stderr}")
        raise RuntimeError("GDAL warp failed")

    Path(temp_tiff).unlink(missing_ok=True)
    print(f"COG created: {output_path}")

    # Verify with gdalinfo subprocess
    result = subprocess.run(["gdalinfo", output_path], capture_output=True, text=True)
    if result.returncode == 0:
        lines = result.stdout.split("\n")
        for line in lines[:10]:
            print(f"  {line}")


def main():
    parser = argparse.ArgumentParser(
        description="Convert WRF/PALM NetCDF to COG with time-series support"
    )
    parser.add_argument("--input", "-i", required=True, help="Input NetCDF file")
    parser.add_argument("--variable", "-v", required=True, help="Variable to extract")
    parser.add_argument("--output", "-o", required=True, help="Output COG file")
    parser.add_argument(
        "--bounds",
        "-b",
        nargs=4,
        type=float,
        help="Bounds (min_lon min_lat max_lon max_lat)",
    )
    parser.add_argument(
        "--zoom-level", "-z", type=int, default=14, help="Target zoom level (10-16)"
    )
    parser.add_argument(
        "--resampling",
        "-r",
        default="average",
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
    print(f"  Available variables: {info['variables'][:10]}...")

    print(f"\nExtracting variable '{args.variable}'...")
    extract_variable_to_geotiff(
        args.input,
        args.variable,
        args.output,
        bounds=tuple(args.bounds) if args.bounds else None,
        target_zoom=args.zoom_level,
        resampling=args.resampling,
        compress=args.compress,
    )

    print("\nDone!")


if __name__ == "__main__":
    main()
