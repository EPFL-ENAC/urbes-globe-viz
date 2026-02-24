#!/usr/bin/env python3
"""
Convert DAVE simulation flow CSV to GeoJSON LineString features.

Joins origin-destination flow data with grid cell centroids (from the
accompanying shapefile) to create arc line features connecting origin and
destination grid cells. Self-flows (origin == dest) are excluded.

Usage:
    python flows_to_geojson.py <grid.shp> <flows.csv> -o output.geojson

Example:
    python flows_to_geojson.py \\
        "../../frontend/public/DAVE simulations/500_grid_Vaud_Geneva_within.shp" \\
        "../../frontend/public/DAVE simulations/flows_1_199_10_min1persons.csv" \\
        -o flows_work.geojson
"""

import argparse
import json
import sys

import geopandas as gpd
import pandas as pd


def flows_to_geojson(grid_path: str, flows_path: str, output_path: str) -> None:
    """Convert an OD flow CSV + grid shapefile to a GeoJSON FeatureCollection.

    Args:
        grid_path: Path to the grid polygon shapefile. Must have an 'id' column.
        flows_path: Path to the flow CSV. Must have 'origin', 'dest', 'flow' columns.
        output_path: Path to write the output GeoJSON file.
    """

    # --- Load grid and compute WGS84 centroids ---
    print("Loading grid shapefile...", file=sys.stderr)
    grid = gpd.read_file(grid_path)
    grid_wgs84 = grid.to_crs("EPSG:4326")
    centroids = grid_wgs84.set_index("id")["geometry"].centroid
    id_to_coords: dict[int, tuple[float, float]] = {
        int(idx): (geom.x, geom.y) for idx, geom in centroids.items()
    }
    print(f"  {len(id_to_coords)} grid cells loaded", file=sys.stderr)

    # --- Load flow CSV ---
    print("Loading flow CSV...", file=sys.stderr)
    flows = pd.read_csv(flows_path, index_col=0)
    total_rows = len(flows)

    # Filter self-flows: origin == dest produces zero-length lines
    flows = flows[flows["origin"] != flows["dest"]]
    print(
        f"  {total_rows} rows → {len(flows)} after removing self-flows",
        file=sys.stderr,
    )

    # --- Build GeoJSON features ---
    features = []
    skipped = 0

    for _, row in flows.iterrows():
        origin_id = int(row["origin"])
        dest_id = int(row["dest"])

        if origin_id not in id_to_coords or dest_id not in id_to_coords:
            skipped += 1
            continue

        orig_lon, orig_lat = id_to_coords[origin_id]
        dest_lon, dest_lat = id_to_coords[dest_id]

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[orig_lon, orig_lat], [dest_lon, dest_lat]],
            },
            "properties": {
                "flow": float(row["flow"]),
                "origin": origin_id,
                "dest": dest_id,
            },
        }
        features.append(feature)

    if skipped:
        print(f"  Skipped {skipped} rows with unmatched grid IDs", file=sys.stderr)

    # --- Write output ---
    geojson = {"type": "FeatureCollection", "features": features}
    with open(output_path, "w") as f:
        json.dump(geojson, f)

    flow_values = [f["properties"]["flow"] for f in features]
    print(f"\nOutput: {len(features)} LineString features", file=sys.stderr)
    print(
        f"Flow range: {min(flow_values):.0f} – {max(flow_values):.0f} persons",
        file=sys.stderr,
    )
    print(f"Written to: {output_path}", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert DAVE OD flow CSV to GeoJSON LineString features"
    )
    parser.add_argument("grid", help="Path to grid shapefile (.shp)")
    parser.add_argument("flows", help="Path to flow CSV file")
    parser.add_argument("-o", "--output", required=True, help="Output GeoJSON path")
    args = parser.parse_args()

    flows_to_geojson(args.grid, args.flows, args.output)
