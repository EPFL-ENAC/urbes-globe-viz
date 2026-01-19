#!/bin/bash
set -e

# Script to convert building heights CSV to PMTiles format
# Input: city_height_obs_vs_sim.csv
# Output: ../../frontend/public/geodata/building_heights_china.pmtiles

echo "Converting CSV to GeoJSON..."
python3 csv_to_geojson.py

echo "Converting GeoJSON to GeoJSONSeq..."
ogr2ogr -f GeoJSONSeq building_heights_china.geojsonseq building_heights_china.geojson

echo "Converting GeoJSONSeq to PMTiles with tippecanoe..."
tippecanoe \
  --output=../../frontend/public/geodata/building_heights_china.pmtiles \
  --layer=building_heights_china \
  --force \
  --maximum-zoom=12 \
  --minimum-zoom=4 \
  --base-zoom=8 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  building_heights_china.geojsonseq

echo "Cleaning up intermediate files..."
rm -f building_heights_china.geojsonseq

echo "Done! PMTiles created at ../../frontend/public/geodata/building_heights_china.pmtiles"
