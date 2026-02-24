#!/usr/bin/env python3
"""
Spatial join: match CSV rows to geometry features (SHP/GPKG) by a shared ID
column, then produce GeoJSON Point or LineString features.

Modes:
  point — each CSV row → Point at the centroid of the matched polygon
  line  — each CSV row has origin + dest IDs → LineString between centroids

Usage:
    # Point mode (e.g. population per zone)
    python csv_spatial_join.py zones.shp data.csv -o data.geojson \\
        --join-col zone_id --geom-id-col id --mode point

    # Line mode (e.g. OD flows between grid cells)
    python csv_spatial_join.py grid.shp flows.csv -o flows.geojson \\
        --join-col origin --geom-id-col id --mode line \\
        --origin-col origin --dest-col dest --value-col flow
"""

import argparse
import json
import sys

import geopandas as gpd
import pandas as pd


def build_centroid_lookup(
    geom_path: str, geom_id_col: str
) -> dict[int | str, tuple[float, float]]:
    """Load geometry file, reproject to WGS84, return {id: (lon, lat)} dict."""
    print(f"Loading geometry from {geom_path}...", file=sys.stderr)
    gdf = gpd.read_file(geom_path)
    gdf_wgs84 = gdf.to_crs("EPSG:4326")
    centroids = gdf_wgs84.set_index(geom_id_col)["geometry"].centroid
    lookup = {}
    for idx, geom in centroids.items():
        try:
            key = int(idx)
        except (ValueError, TypeError):
            key = str(idx)
        lookup[key] = (geom.x, geom.y)
    print(f"  {len(lookup)} geometries loaded", file=sys.stderr)
    return lookup


def point_mode(
    df: pd.DataFrame,
    lookup: dict,
    join_col: str,
) -> list[dict]:
    """One Point per CSV row, located at the centroid of the matched geometry."""
    prop_cols = [c for c in df.columns if c != join_col]
    features, skipped = [], 0

    for _, row in df.iterrows():
        try:
            key = int(row[join_col])
        except (ValueError, TypeError):
            key = str(row[join_col])

        if key not in lookup:
            skipped += 1
            continue

        lon, lat = lookup[key]
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                col: (None if pd.isna(row[col]) else row[col]) for col in prop_cols
            },
        })

    if skipped:
        print(f"  Skipped {skipped} rows with unmatched IDs", file=sys.stderr)
    return features


def line_mode(
    df: pd.DataFrame,
    lookup: dict,
    origin_col: str,
    dest_col: str,
    value_col: str,
) -> list[dict]:
    """One LineString per CSV row, from origin centroid to dest centroid."""
    # Drop self-flows
    before = len(df)
    df = df[df[origin_col] != df[dest_col]]
    if len(df) < before:
        print(
            f"  Dropped {before - len(df)} self-flows (origin == dest)", file=sys.stderr
        )

    extra_cols = [
        c for c in df.columns if c not in (origin_col, dest_col, value_col)
    ]
    features, skipped = [], 0

    for _, row in df.iterrows():
        try:
            o_key, d_key = int(row[origin_col]), int(row[dest_col])
        except (ValueError, TypeError):
            o_key, d_key = str(row[origin_col]), str(row[dest_col])

        if o_key not in lookup or d_key not in lookup:
            skipped += 1
            continue

        o_lon, o_lat = lookup[o_key]
        d_lon, d_lat = lookup[d_key]
        props = {
            value_col: float(row[value_col]),
            "origin": o_key,
            "dest": d_key,
        }
        for col in extra_cols:
            props[col] = None if pd.isna(row[col]) else row[col]

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[o_lon, o_lat], [d_lon, d_lat]],
            },
            "properties": props,
        })

    if skipped:
        print(f"  Skipped {skipped} rows with unmatched IDs", file=sys.stderr)
    return features


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Spatial join: CSV + geometry → GeoJSON (point or line)"
    )
    parser.add_argument("geometry", help="Geometry file (.shp or .gpkg)")
    parser.add_argument("csv", help="Input CSV file")
    parser.add_argument("-o", "--output", required=True, help="Output GeoJSON path")
    parser.add_argument(
        "--join-col",
        required=True,
        help="CSV column to join on (or origin column in line mode)",
    )
    parser.add_argument(
        "--geom-id-col", required=True, help="ID column in the geometry file"
    )
    parser.add_argument(
        "--mode",
        choices=["point", "line"],
        default="point",
        help="point: one point per row; line: origin→dest LineString (default: point)",
    )
    # Line mode options
    parser.add_argument("--origin-col", help="Origin ID column (line mode)")
    parser.add_argument("--dest-col", help="Destination ID column (line mode)")
    parser.add_argument(
        "--value-col", default="value", help="Numeric value column (line mode)"
    )
    args = parser.parse_args()

    lookup = build_centroid_lookup(args.geometry, args.geom_id_col)

    print(f"Loading CSV from {args.csv}...", file=sys.stderr)
    df = pd.read_csv(args.csv)
    print(f"  {len(df)} rows", file=sys.stderr)

    if args.mode == "point":
        features = point_mode(df, lookup, args.join_col)
        geom_type = "Point"
    else:
        if not args.origin_col or not args.dest_col:
            print(
                "Error: --origin-col and --dest-col required for line mode",
                file=sys.stderr,
            )
            sys.exit(1)
        features = line_mode(df, lookup, args.origin_col, args.dest_col, args.value_col)
        geom_type = "LineString"

    geojson = {"type": "FeatureCollection", "features": features}
    with open(args.output, "w") as f:
        json.dump(geojson, f)

    print(f"\n{len(features)} {geom_type} features written to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
