#!/usr/bin/env python3
"""
Convert building heights CSV to GeoJSON format.
Creates point features with ~25km² grid cells for visualization.
"""

import csv
import json
from datetime import datetime


def csv_to_geojson(input_csv, output_geojson):
    """Convert CSV with building height data to GeoJSON."""

    features = []

    with open(input_csv, "r") as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            # Parse coordinates
            lon = float(row["x"])
            lat = float(row["y"])

            # Parse height values
            height_fit = float(row["height_fit"])
            sim_height_fit = float(row["sim_height_fit"])

            # Parse year (extract year from date string)
            year_str = row["year"]
            year = int(year_str.split("-")[0])

            # Create GeoJSON feature
            feature = {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "city": row["city"],
                    "height_fit": height_fit,
                    "sim_height_fit": sim_height_fit,
                    "year": year,
                },
            }

            features.append(feature)

    # Create GeoJSON FeatureCollection
    geojson = {"type": "FeatureCollection", "features": features}

    # Write to output file
    with open(output_geojson, "w") as outfile:
        json.dump(geojson, outfile)

    print(f"Converted {len(features)} features to GeoJSON")
    print(
        f"Year range: {min(f['properties']['year'] for f in features)} - {max(f['properties']['year'] for f in features)}"
    )
    print(
        f"Height range: {min(f['properties']['height_fit'] for f in features):.2f} - {max(f['properties']['height_fit'] for f in features):.2f} meters"
    )


if __name__ == "__main__":
    csv_to_geojson("city_height_obs_vs_sim.csv", "building_heights_china.geojson")
