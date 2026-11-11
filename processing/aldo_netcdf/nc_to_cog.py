#!/usr/bin/env python3
"""
Convert a WRF output file (NetCDF) to a Cloud Optimized GeoTIFF (COG), and
write wind arrows as JSON.

Each timestep of the file becomes one band of the COG. The WRF grid is
curvilinear: we place it with ground control points (GCPs) taken from
XLONG/XLAT, then warp it to Web Mercator (EPSG:3857), the projection the
viewer needs.

Only rasterio is used (its wheel ships GDAL), so no system GDAL is needed.

Variables:
    raw WRF names       T2, TSK, U10, V10, Q2, SWDOWN, ... (same units as WRF)
    T2C, TSKC           T2 and TSK in °C (K - 273.15)
    WS10                10 m wind speed in m/s, sqrt(U10² + V10²)

Usage:
    uv run nc_to_cog.py -i wrfout_d03_2022-07-15_12_00_00 -v T2C -o wrf_d03_t2c_cog.tif
    uv run nc_to_cog.py -i wrfout_d03_2022-07-15_12_00_00 --arrows wrf_d03_wind10.json --stride 4
"""

import argparse
import json
import math
import tempfile
import warnings
from collections.abc import Callable
from pathlib import Path

import netCDF4 as nc
import numpy as np
import rasterio
import rasterio.shutil
from rasterio.control import GroundControlPoint
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.errors import NotGeoreferencedWarning
from rasterio.vrt import WarpedVRT

KELVIN = 273.15

# The raw grid is placed with GCPs, set right after the file is created.
warnings.filterwarnings("ignore", category=NotGeoreferencedWarning)

# Derived variables: name -> (WRF variables it needs, function of their arrays).
DERIVED: dict[str, tuple[tuple[str, ...], Callable[..., np.ndarray]]] = {
    "T2C": (("T2",), lambda t2: t2 - KELVIN),
    "TSKC": (("TSK",), lambda tsk: tsk - KELVIN),
    "WS10": (("U10", "V10"), lambda u, v: np.hypot(u, v)),
}

WGS84 = CRS.from_epsg(4326)
WEB_MERCATOR = CRS.from_epsg(3857)


def _read(ds: nc.Dataset, name: str) -> np.ndarray:
    """Read a (Time, south_north, west_east) variable as float32, NaN for masked cells."""
    var = next((v for v in ds.variables if v.lower() == name.lower()), None)
    if var is None:
        raise ValueError(f"Variable '{name}' not found. Available: {list(ds.variables)}")
    data = ds.variables[var][:]
    if data.ndim != 3:
        raise ValueError(f"'{var}' has shape {data.shape}, expected (Time, y, x)")
    return np.ma.filled(data.astype(np.float32), np.nan)


def read_variable(ds: nc.Dataset, name: str) -> np.ndarray:
    """Raw WRF variable or derived one, shape (Time, y, x)."""
    derived = DERIVED.get(name.upper())
    if derived is None:
        return _read(ds, name)
    inputs, fn = derived
    return fn(*(_read(ds, v) for v in inputs)).astype(np.float32)


def read_lonlat(ds: nc.Dataset) -> tuple[np.ndarray, np.ndarray]:
    """2D lon/lat of the mass grid (first timestep, the grid does not move)."""
    return _read(ds, "XLONG")[0], _read(ds, "XLAT")[0]


def earth_winds(ds: nc.Dataset) -> tuple[np.ndarray, np.ndarray]:
    """U10/V10 rotated from the grid axes to east/north.

    WRF winds follow the model grid. On a Lambert grid, grid north is not true
    north, SINALPHA/COSALPHA give the angle. The speed does not change.
    """
    u, v = _read(ds, "U10"), _read(ds, "V10")
    if "SINALPHA" in ds.variables and "COSALPHA" in ds.variables:
        sina, cosa = _read(ds, "SINALPHA"), _read(ds, "COSALPHA")
        u, v = u * cosa - v * sina, v * cosa + u * sina
    return u, v


def make_gcps(lon: np.ndarray, lat: np.ndarray, step: int = 10) -> list[GroundControlPoint]:
    """GCPs every `step` cells plus the 4 corners, at cell centers."""
    height, width = lon.shape
    cells = {(r, c) for r in range(0, height, step) for c in range(0, width, step)}
    cells |= {(0, 0), (0, width - 1), (height - 1, 0), (height - 1, width - 1)}
    return [
        GroundControlPoint(row=r + 0.5, col=c + 0.5, x=float(lon[r, c]), y=float(lat[r, c]))
        for r, c in sorted(cells)
    ]


def print_stats(name: str, data: np.ndarray):
    valid = data[np.isfinite(data)]
    p1, p99 = np.percentile(valid, [1, 99])
    print(
        f"  {name}: min {valid.min():.4f}  p1 {p1:.4f}  mean {valid.mean():.4f}"
        f"  p99 {p99:.4f}  max {valid.max():.4f}"
    )


def write_cog(
    data: np.ndarray,
    lon: np.ndarray,
    lat: np.ndarray,
    output: Path,
    resampling: str = "bilinear",
    compress: str = "DEFLATE",
):
    """Warp (Time, y, x) data to EPSG:3857 and write it as a COG, one band per timestep."""
    count, height, width = data.shape

    with tempfile.TemporaryDirectory(prefix="nc_to_cog_") as tmp:
        # 1. Raw grid as a GeoTIFF, placed with GCPs (no affine transform).
        raw_tif = Path(tmp) / "raw.tif"
        with rasterio.open(
            raw_tif, "w", driver="GTiff", width=width, height=height, count=count,
            dtype="float32", nodata=np.nan,
        ) as raw:
            raw.write(data)
            raw.gcps = (make_gcps(lon, lat), WGS84)

        # 2. Warp to EPSG:3857, like gdalwarp: GDAL picks the output grid.
        warped_tif = Path(tmp) / "warped.tif"
        with rasterio.open(raw_tif) as raw, WarpedVRT(
            raw,
            crs=WEB_MERCATOR,
            resampling=Resampling[resampling],
            src_nodata=np.nan,
            nodata=np.nan,
        ) as vrt:
            profile = {
                "driver": "GTiff",
                "width": vrt.width,
                "height": vrt.height,
                "count": count,
                "dtype": "float32",
                "crs": WEB_MERCATOR,
                "transform": vrt.transform,
                "nodata": np.nan,
            }
            with rasterio.open(warped_tif, "w", **profile) as dst:
                dst.write(vrt.read())

        # 3. COG. GoogleMapsCompatible aligns the pixels on the web map tile
        # grid. Without it the viewer draws the data at the wrong place.
        rasterio.shutil.copy(
            warped_tif,
            output,
            driver="COG",
            COMPRESS=compress,
            LEVEL=6,
            PREDICTOR=2,
            BLOCKSIZE=256,
            TILING_SCHEME="GoogleMapsCompatible",
            OVERVIEW_RESAMPLING="AVERAGE",
            BIGTIFF="IF_SAFER",
        )

    with rasterio.open(output) as cog:
        b = cog.bounds
        print(
            f"  COG: {output} ({output.stat().st_size} bytes), {cog.width}x{cog.height} px,"
            f" {cog.count} band(s), bounds [{b.left:.0f}, {b.bottom:.0f}, {b.right:.0f}, {b.top:.0f}]"
        )


def write_arrows(ds: nc.Dataset, output: Path, stride: int):
    """Wind arrows on the native grid, one every `stride` cells, first timestep.

    Each point is [lon, lat, direction, speed]. The direction is where the wind
    comes from, in degrees from north (WD = atan2(-U, -V) * 57.29578, as asked
    by URBES), between 0 and 360. The speed is in m/s.
    """
    lon, lat = read_lonlat(ds)
    u, v = earth_winds(ds)
    u, v = u[0], v[0]
    height, width = lon.shape
    # Start half a stride in, so the arrows are centered in the domain.
    offset = stride // 2
    points = []
    for r in range(offset, height, stride):
        for c in range(offset, width, stride):
            uu, vv = float(u[r, c]), float(v[r, c])
            if not (math.isfinite(uu) and math.isfinite(vv)):
                continue
            direction = (math.atan2(-uu, -vv) * 57.29578) % 360
            points.append(
                [
                    round(float(lon[r, c]), 5),
                    round(float(lat[r, c]), 5),
                    round(direction, 1),
                    round(math.hypot(uu, vv), 2),
                ]
            )
    spacing_m = float(ds.DX) * stride
    output.write_text(
        json.dumps(
            {
                "description": "10 m wind. Each point is [lon, lat, direction the wind comes from in degrees north, speed in m/s].",
                "spacing_m": spacing_m,
                "points": points,
            },
            separators=(",", ":"),
        )
    )
    print(f"  Arrows: {output} ({output.stat().st_size} bytes), {len(points)} points, {spacing_m:.0f} m apart")


def main():
    parser = argparse.ArgumentParser(
        description="Convert a WRF NetCDF file to a COG (one band per timestep), or to wind arrows"
    )
    parser.add_argument("--input", "-i", required=True, help="Input WRF NetCDF file")
    parser.add_argument(
        "--variable", "-v", help=f"Variable: a WRF name or one of {', '.join(DERIVED)}"
    )
    parser.add_argument("--output", "-o", help="Output COG file")
    parser.add_argument("--arrows", help="Write wind arrows (JSON) to this file")
    parser.add_argument("--stride", type=int, default=4, help="One arrow every N cells (default 4)")
    parser.add_argument(
        "--resampling",
        "-r",
        default="bilinear",
        choices=["nearest", "average", "bilinear", "cubic"],
    )
    parser.add_argument("--compress", "-c", default="DEFLATE", choices=["DEFLATE", "LZW", "ZSTD"])
    args = parser.parse_args()

    if not args.arrows and not (args.variable and args.output):
        parser.error("give --variable and --output, or --arrows")
    if not Path(args.input).exists():
        raise FileNotFoundError(f"Input file not found: {args.input}")

    print(f"{args.input}")
    with nc.Dataset(args.input) as ds:
        if args.variable and args.output:
            data = read_variable(ds, args.variable)
            print(f"  {args.variable}: {data.shape[0]} timestep(s), grid {data.shape[1]}x{data.shape[2]}")
            print_stats(args.variable, data)
            lon, lat = read_lonlat(ds)
            write_cog(data, lon, lat, Path(args.output), args.resampling, args.compress)
        if args.arrows:
            write_arrows(ds, Path(args.arrows), args.stride)


if __name__ == "__main__":
    main()
