#!/usr/bin/env python3
"""
Convert a CSV with lat/lon columns to GeoJSON Point features.

All non-coordinate columns are preserved as feature properties.

Usage:
    python csv_to_pmtiles.py data.csv -o data.geojson
    python csv_to_pmtiles.py data.csv -o data.geojson --lat-col latitude --lon-col longitude

Example:
    python csv_to_pmtiles.py sensors.csv -o sensors.geojson --lat-col y --lon-col x
"""

import argparse
import json
import sys

import pandas as pd


def csv_to_geojson(
    input_csv: str, output_path: str, lat_col: str, lon_col: str
) -> None:
    print(f"Loading {input_csv}...", file=sys.stderr)
    df = pd.read_csv(input_csv)

    if lat_col not in df.columns or lon_col not in df.columns:
        available = ", ".join(df.columns.tolist())
        print(
            f"Error: columns '{lat_col}' and/or '{lon_col}' not found.\n"
            f"Available columns: {available}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Drop rows with missing coordinates
    before = len(df)
    df = df.dropna(subset=[lat_col, lon_col])
    if len(df) < before:
        print(
            f"  Dropped {before - len(df)} rows with missing coordinates",
            file=sys.stderr,
        )

    # Columns to include as properties (everything except lat/lon)
    prop_cols = [c for c in df.columns if c not in (lat_col, lon_col)]

    features = []
    for _, row in df.iterrows():
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row[lon_col]), float(row[lat_col])],
            },
            "properties": {
                col: (None if pd.isna(row[col]) else row[col])
                for col in prop_cols
            },
        }
        features.append(feature)

    geojson = {"type": "FeatureCollection", "features": features}
    with open(output_path, "w") as f:
        json.dump(geojson, f)

    print(f"\n{len(features)} Point features written to {output_path}", file=sys.stderr)

    # Summary stats for numeric columns
    for col in prop_cols:
        if pd.api.types.is_numeric_dtype(df[col]):
            print(
                f"  {col}: {df[col].min():.2f} – {df[col].max():.2f}",
                file=sys.stderr,
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert CSV with lat/lon to GeoJSON Point features"
    )
    parser.add_argument("input", help="Input CSV file path")
    parser.add_argument("-o", "--output", required=True, help="Output GeoJSON path")
    parser.add_argument(
        "--lat-col", default="lat", help="Latitude column name (default: lat)"
    )
    parser.add_argument(
        "--lon-col", default="lon", help="Longitude column name (default: lon)"
    )
    args = parser.parse_args()

    csv_to_geojson(args.input, args.output, args.lat_col, args.lon_col)
