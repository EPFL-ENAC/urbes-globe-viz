#!/bin/bash
set -e

# Script to download and process Global Urban Footprint data to Cloud Optimized GeoTIFF
# Output: ../../frontend/public/geodata/guf_*_cog.tif

echo "========================================="
echo "Global Urban Footprint (GUF) Processing"
echo "========================================="
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed."
    echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Default: Download global data at 2.8 arcsec resolution
REGION="${1:-global}"
RESOLUTION="${2:-2.8}"

echo "Downloading GUF data..."
echo "Region: $REGION"
echo "Resolution: $RESOLUTION arcsec"
echo ""

# Run with uv
uv run --project ../.. ../guf_urban_footprint/download_guf_cog.py \
    --region "$REGION" \
    --resolution "$RESOLUTION" \
    --tile-size 2048 \
    --max-pixels 50000

echo ""
echo "========================================="
echo "Processing complete!"
echo "========================================="
echo ""
echo "To use in your deck.gl application:"
echo "1. The COG file is ready in frontend/public/geodata/"
echo "2. Use GeoTiffLayer from @deck.gl/geo-layers"
echo "3. Point to the file path relative to public/"
echo ""
echo "Example usage:"
echo "  new GeoTiffLayer({"
echo "    id: 'guf-layer',"
echo "    data: '/geodata/guf_${REGION}_${RESOLUTION}arcsec_cog.tif',"
echo "  });"
echo ""
