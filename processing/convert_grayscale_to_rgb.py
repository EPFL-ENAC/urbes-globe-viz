#!/usr/bin/env python3
"""
Convert grayscale GeoTIFF to RGB for deck.gl-geotiff compatibility.
"""

import argparse
import sys
from pathlib import Path

try:
    import numpy as np
    import rasterio
    from rasterio.enums import ColorInterp
except ImportError:
    print("Error: rasterio and numpy required. Install with: uv sync")
    sys.exit(1)


def convert_grayscale_to_rgb(input_path: Path, output_path: Path) -> None:
    """
    Convert a grayscale GeoTIFF to RGB by duplicating the band.
    Processes in chunks to handle large files.

    Args:
        input_path: Path to input grayscale GeoTIFF
        output_path: Path to output RGB GeoTIFF
    """
    print(f"Reading {input_path}...")

    with rasterio.open(input_path) as src:
        # Read metadata
        profile = src.profile.copy()

        # Update profile for RGB output
        profile.update(
            count=3,
            photometric="RGB",
        )

        print(f"Writing RGB version to {output_path}...")
        print(f"Image size: {src.width}x{src.height} pixels")

        # Get block size for chunked reading
        block_height, block_width = src.block_shapes[0]
        print(f"Processing in blocks of {block_width}x{block_height}...")

        with rasterio.open(output_path, "w", **profile) as dst:
            # Set color interpretation
            dst.colorinterp = [ColorInterp.red, ColorInterp.green, ColorInterp.blue]

            # Process in windows/blocks
            block_count = 0
            for block_index, window in src.block_windows(1):
                # Read grayscale block
                gray_block = src.read(1, window=window)

                # Write to all 3 RGB bands
                dst.write(gray_block, 1, window=window)  # Red
                dst.write(gray_block, 2, window=window)  # Green
                dst.write(gray_block, 3, window=window)  # Blue

                block_count += 1
                if block_count % 100 == 0:
                    print(f"  Processed {block_count} blocks...")

    print(f"✓ Conversion complete: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Convert grayscale GeoTIFF to RGB for deck.gl-geotiff"
    )
    parser.add_argument("input", type=Path, help="Input grayscale GeoTIFF file")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        help="Output RGB GeoTIFF file (default: input_rgb.tif)",
    )

    args = parser.parse_args()

    # Default output name
    if not args.output:
        args.output = args.input.parent / f"{args.input.stem}_rgb{args.input.suffix}"

    # Check input exists
    if not args.input.exists():
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    # Convert
    convert_grayscale_to_rgb(args.input, args.output)


if __name__ == "__main__":
    main()
