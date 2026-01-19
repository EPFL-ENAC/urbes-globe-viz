#!/usr/bin/env python3
"""
Download DLR Global Urban Footprint (GUF) data and convert to Cloud Optimized GeoTIFF.

This script downloads urban footprint data from the DLR WMS service and creates
a Cloud Optimized GeoTIFF (COG) for efficient web visualization with deck.gl.
"""

import argparse
import hashlib
import math
import os
import sys
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlencode

import numpy as np
import requests
from PIL import Image
from tqdm import tqdm

try:
    import rasterio
    from rasterio.crs import CRS
    from rasterio.transform import from_bounds
    from rasterio.warp import calculate_default_transform, reproject, Resampling
except ImportError:
    print("Error: rasterio not installed. Install with: pip install rasterio")
    sys.exit(1)


# Predefined regions (west, south, east, north)
REGIONS = {
    "global": (-180, -90, 180, 90),
    "europe": (-25, 35, 45, 72),
    "asia": (60, -10, 150, 55),
    "africa": (-20, -35, 55, 40),
    "north_america": (-170, 15, -50, 75),
    "south_america": (-82, -56, -34, 13),
    "oceania": (110, -50, 180, 0),
}

WMS_LAYERS = {
    "0.4": "GUF04_DLR_v1_Mosaic",  # ~12m resolution
    "2.8": "GUF28_DLR_v1_Mosaic",  # ~84m resolution
}


def get_wms_tile(
    bbox: Tuple[float, float, float, float],
    width: int,
    height: int,
    layer: str,
    cache_dir: Optional[Path] = None,
) -> np.ndarray:
    """
    Fetch a single tile from DLR WMS service with optional caching.

    Args:
        bbox: (west, south, east, north) in EPSG:4326
        width: Image width in pixels
        height: Image height in pixels
        layer: WMS layer name
        cache_dir: Optional directory to cache downloaded tiles

    Returns:
        numpy array of shape (height, width) with uint8 values
    """
    west, south, east, north = bbox

    # Check cache first
    if cache_dir:
        cache_dir.mkdir(parents=True, exist_ok=True)
        # Create unique filename based on bbox, dimensions, and layer
        cache_key = f"{layer}_{west}_{south}_{east}_{north}_{width}_{height}"
        cache_hash = hashlib.md5(cache_key.encode()).hexdigest()
        cache_file = cache_dir / f"tile_{cache_hash}.npy"

        if cache_file.exists():
            return np.load(cache_file)

    params = {
        "SERVICE": "WMS",
        "VERSION": "1.3.0",
        "REQUEST": "GetMap",
        "LAYERS": layer,
        "STYLES": "",
        "CRS": "EPSG:4326",
        "BBOX": f"{south},{west},{north},{east}",  # WMS 1.3.0 with EPSG:4326 uses lat,lon order
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "FORMAT": "image/png",
        "TRANSPARENT": "false",
    }

    url = f"https://geoservice.dlr.de/eoc/land/wms?{urlencode(params)}"

    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content))
        # Convert to numpy array and take first channel (all channels are the same for grayscale)
        arr = np.array(img)
        if arr.ndim == 3:
            arr = arr[:, :, 0]

        # Save to cache
        if cache_dir:
            np.save(cache_file, arr)

        return arr
    except Exception as e:
        print(f"Error fetching tile {bbox}: {e}")
        # Return nodata array
        return np.full((height, width), 128, dtype=np.uint8)


def create_cog(
    bbox: Tuple[float, float, float, float],
    output_path: Path,
    resolution: str = "2.8",
    tile_size: int = 2048,
    max_pixels: int = 50000,
    cache_dir: Optional[Path] = None,
) -> None:
    """
    Download GUF data and create a Cloud Optimized GeoTIFF with optional tile caching.

    Args:
        bbox: (west, south, east, north) in EPSG:4326
        output_path: Path for output COG file
        resolution: "0.4" for ~12m or "2.8" for ~84m
        tile_size: Size of WMS request tiles in pixels
        max_pixels: Maximum dimension in pixels (to prevent too large files)
    """
    west, south, east, north = bbox
    layer = WMS_LAYERS[resolution]

    # Calculate approximate resolution in degrees
    res_arcsec = float(resolution)
    res_deg = res_arcsec / 3600.0

    # Calculate output dimensions
    width = int((east - west) / res_deg)
    height = int((north - south) / res_deg)

    # Limit to max_pixels to prevent memory issues
    if width > max_pixels:
        scale = max_pixels / width
        width = max_pixels
        height = int(height * scale)
        res_deg = (east - west) / width

    if height > max_pixels:
        scale = max_pixels / height
        height = max_pixels
        width = int(width * scale)
        res_deg = (north - south) / height

    print(f"Output dimensions: {width}x{height} pixels")
    print(f"Effective resolution: {res_deg * 3600:.2f} arcsec")

    # Calculate number of tiles needed
    n_tiles_x = math.ceil(width / tile_size)
    n_tiles_y = math.ceil(height / tile_size)
    total_tiles = n_tiles_x * n_tiles_y

    print(f"Downloading {total_tiles} tiles ({n_tiles_x}x{n_tiles_y})...")

    # Create output array
    data = np.zeros((height, width), dtype=np.uint8)

    # Download tiles with progress bar
    with tqdm(total=total_tiles, desc="Downloading tiles") as pbar:
        for ty in range(n_tiles_y):
            for tx in range(n_tiles_x):
                # Calculate tile bounds in pixels
                x_start = tx * tile_size
                y_start = ty * tile_size
                x_end = min(x_start + tile_size, width)
                y_end = min(y_start + tile_size, height)

                tile_width = x_end - x_start
                tile_height = y_end - y_start

                # Calculate geographic bounds for this tile
                tile_west = west + (x_start / width) * (east - west)
                tile_east = west + (x_end / width) * (east - west)
                tile_north = north - (y_start / height) * (north - south)
                tile_south = north - (y_end / height) * (north - south)

                # Fetch tile
                tile_data = get_wms_tile(
                    (tile_west, tile_south, tile_east, tile_north),
                    tile_width,
                    tile_height,
                    layer,
                    cache_dir,
                )

                # Place in output array
                data[y_start:y_end, x_start:x_end] = tile_data

                pbar.update(1)

    print("Creating Cloud Optimized GeoTIFF...")

    # Create transform
    transform = from_bounds(west, south, east, north, width, height)

    # Write COG with optimal settings
    profile = {
        "driver": "GTiff",
        "dtype": "uint8",
        "width": width,
        "height": height,
        "count": 1,
        "crs": "EPSG:4326",
        "transform": transform,
        "compress": "DEFLATE",
        "tiled": True,
        "blockxsize": 512,
        "blockysize": 512,
        "ZLEVEL": 9,
        "PREDICTOR": 2,
        "NUM_THREADS": "ALL_CPUS",
        "BIGTIFF": "IF_SAFER",
    }

    # Add COG-specific options
    profile.update(
        {
            "COPY_SRC_OVERVIEWS": "YES",
            "TILED": "YES",
        }
    )

    with rasterio.open(output_path, "w", **profile) as dst:
        dst.write(data, 1)

        # Set nodata value
        dst.nodata = 128

        # Add metadata
        dst.update_tags(
            DESCRIPTION=f"Global Urban Footprint (GUF) - {resolution} arcsec resolution",
            SOURCE="German Aerospace Center (DLR)",
            LICENSE="Free for scientific and non-commercial use",
            RESOLUTION_ARCSEC=resolution,
            BBOX=f"{west},{south},{east},{north}",
        )

        # Build overviews for COG
        print("Building overviews...")
        overview_levels = [2, 4, 8, 16, 32]
        dst.build_overviews(overview_levels, Resampling.average)
        dst.update_tags(ns="rio_overview", resampling="average")

    print(f"COG created successfully: {output_path}")
    print(f"File size: {output_path.stat().st_size / 1024 / 1024:.1f} MB")

    # Data value interpretation
    print("\nData values:")
    print("  255 = Built-up areas (vertical structures)")
    print("    0 = Non-built-up surfaces")
    print("  128 = No data / No satellite coverage")


def main():
    parser = argparse.ArgumentParser(
        description="Download DLR Global Urban Footprint and create Cloud Optimized GeoTIFF"
    )
    parser.add_argument(
        "--region",
        choices=list(REGIONS.keys()),
        help="Predefined region to download",
    )
    parser.add_argument(
        "--bbox",
        help="Custom bounding box as 'west,south,east,north' (EPSG:4326)",
    )
    parser.add_argument(
        "--resolution",
        choices=["0.4", "2.8"],
        default="2.8",
        help="Resolution in arcseconds (0.4=~12m, 2.8=~84m). Default: 2.8",
    )
    parser.add_argument(
        "--tile-size",
        type=int,
        default=2048,
        help="WMS tile size in pixels. Default: 2048",
    )
    parser.add_argument(
        "--max-pixels",
        type=int,
        default=50000,
        help="Maximum output dimension in pixels. Default: 50000",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output file path. Default: auto-generated",
    )
    parser.add_argument(
        "--cache-dir",
        type=str,
        default="tile_cache",
        help="Directory to cache downloaded tiles (default: tile_cache)",
    )

    args = parser.parse_args()

    # Determine bbox
    if args.region:
        bbox = REGIONS[args.region]
        region_name = args.region
    elif args.bbox:
        try:
            bbox = tuple(map(float, args.bbox.split(",")))
            if len(bbox) != 4:
                raise ValueError
            region_name = "custom"
        except ValueError:
            print("Error: bbox must be in format 'west,south,east,north'")
            sys.exit(1)
    else:
        print("Error: Must specify either --region or --bbox")
        parser.print_help()
        sys.exit(1)

    # Determine output path
    if args.output:
        output_path = args.output
    else:
        output_dir = (
            Path(__file__).parent.parent.parent / "frontend" / "public" / "geodata"
        )
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"guf_{region_name}_{args.resolution}arcsec_cog.tif"

    # Setup cache directory
    cache_dir = Path(__file__).parent / args.cache_dir if args.cache_dir else None

    # Create COG
    create_cog(
        bbox=bbox,
        output_path=output_path,
        resolution=args.resolution,
        tile_size=args.tile_size,
        max_pixels=args.max_pixels,
        cache_dir=cache_dir,
    )


if __name__ == "__main__":
    main()
