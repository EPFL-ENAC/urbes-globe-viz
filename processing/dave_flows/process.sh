#!/bin/bash
set -e

# Convert DAVE flow CSV to PMTiles via GeoJSON spatial join.
# Usage: ./process.sh <grid.shp> <flows.csv> <output.pmtiles>

GRID_PATH="$1"
FLOWS_PATH="$2"
OUTPUT_PMTILES="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEOJSON_OUT="$(dirname "${OUTPUT_PMTILES}")/$(basename "${OUTPUT_PMTILES}" .pmtiles).geojson"

echo "📦 Step 1: Converting flow CSV to GeoJSON (spatial join with grid)..."
uv run --project "${SCRIPT_DIR}/.." \
  python "${SCRIPT_DIR}/flows_to_geojson.py" \
  "${GRID_PATH}" \
  "${FLOWS_PATH}" \
  -o "${GEOJSON_OUT}"

echo "🗺️  Step 2: Converting GeoJSON to PMTiles with tippecanoe..."
tippecanoe \
  --output="${OUTPUT_PMTILES}" \
  --layer=dave_flows \
  --minimum-zoom=5 \
  --maximum-zoom=12 \
  --drop-densest-as-needed \
  --force \
  "${GEOJSON_OUT}"

echo "✅ Done! GeoJSON at ${GEOJSON_OUT}, PMTiles at ${OUTPUT_PMTILES}"
echo ""
echo "☁️  Step 3 (optional): Upload to CDN:"
echo "  s3cmd put \"${GEOJSON_OUT}\" s3://urbes-viz/"
echo "  s3cmd put \"${OUTPUT_PMTILES}\" s3://urbes-viz/"
