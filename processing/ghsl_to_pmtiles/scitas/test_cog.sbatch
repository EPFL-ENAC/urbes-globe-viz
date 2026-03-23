#!/bin/bash
#SBATCH --job-name=ghsl_test_cog
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --time=0:30:00
#SBATCH --account=enac-it4r
#SBATCH --partition=standard
#SBATCH --output=/work/enac-it4r/ghsl/logs/test_cog_%j.log

# ─────────────────────────────────────────────────────────────────────────────
# Validate that the COG approach still crashes at global scale.
# Runs three tests in sequence:
#   Test 1 — small crop, BLOCKSIZE=512, ZOOM_LEVEL=13  → should SUCCEED
#   Test 2 — global,     BLOCKSIZE=512, ZOOM_LEVEL=13  → expect CRASH (67M tiles)
#   Test 3 — global,     BLOCKSIZE=1024, ZOOM_LEVEL=13 → might WORK (~17M tiles)
# ─────────────────────────────────────────────────────────────────────────────

WORK=/work/enac-it4r/ghsl
SRC=$WORK/ghsl_built_3857_cog.tif
GDAL="apptainer exec --bind $WORK $WORK/gdal.sif"

mkdir -p "$WORK/logs" "$WORK/test_outputs"

if [ ! -f "$SRC" ]; then
    echo "ERROR: source file not found: $SRC"
    echo "Transfer it first: rsync -avP enacit4r-cuda:/mnt/nvme/urbes-globe-viz/geodata/ghsl_built_3857_cog.tif $WORK/"
    exit 1
fi

echo "Source file: $(du -h $SRC | cut -f1)  $SRC"
echo "GDAL version: $($GDAL gdalinfo --version)"
echo ""

# ── Test 1: small crop (should work) ─────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "Test 1: COG — 10k×10k crop, BLOCKSIZE=512, ZOOM_LEVEL=13"
echo "(Expect: SUCCESS)"
echo "═══════════════════════════════════════════════════════"
rm -f "$WORK/test_outputs/crop_b512.tif"
$GDAL gdal_translate \
    "$SRC" \
    "$WORK/test_outputs/crop_b512.tif" \
    -of COG \
    -co TILING_SCHEME=GoogleMapsCompatible \
    -co BLOCKSIZE=512 \
    -co ZOOM_LEVEL=13 \
    -co COMPRESS=DEFLATE \
    -co BIGTIFF=YES \
    -srcwin 0 0 10240 10240 \
    --config GDAL_NUM_THREADS 4
echo "Test 1 exit code: $?"
echo ""

# ── Test 2: global, BLOCKSIZE=512 (expect crash) ──────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "Test 2: COG — GLOBAL, BLOCKSIZE=512, ZOOM_LEVEL=13"
echo "(Expect: CRASH — TIFFSetupStrips:Too large Strip/Tile Offsets/ByteCounts arrays)"
echo "═══════════════════════════════════════════════════════"
rm -f "$WORK/test_outputs/global_b512.tif"
$GDAL gdal_translate \
    "$SRC" \
    "$WORK/test_outputs/global_b512.tif" \
    -of COG \
    -co TILING_SCHEME=GoogleMapsCompatible \
    -co BLOCKSIZE=512 \
    -co ZOOM_LEVEL=13 \
    -co COMPRESS=DEFLATE \
    -co BIGTIFF=YES \
    --config GDAL_NUM_THREADS 4
echo "Test 2 exit code: $?"
echo ""

# ── Test 3: global, BLOCKSIZE=1024 (might work, ~17M tiles) ──────────────────
echo "═══════════════════════════════════════════════════════"
echo "Test 3: COG — GLOBAL, BLOCKSIZE=1024, ZOOM_LEVEL=13"
echo "(Expect: unknown — ~17M tiles, 4x fewer than BLOCKSIZE=512)"
echo "═══════════════════════════════════════════════════════"
rm -f "$WORK/test_outputs/global_b1024.tif"
$GDAL gdal_translate \
    "$SRC" \
    "$WORK/test_outputs/global_b1024.tif" \
    -of COG \
    -co TILING_SCHEME=GoogleMapsCompatible \
    -co BLOCKSIZE=1024 \
    -co ZOOM_LEVEL=13 \
    -co COMPRESS=DEFLATE \
    -co BIGTIFF=YES \
    --config GDAL_NUM_THREADS 4
T3_EXIT=$?
echo "Test 3 exit code: $T3_EXIT"
if [ $T3_EXIT -eq 0 ] && [ -f "$WORK/test_outputs/global_b1024.tif" ]; then
    echo ""
    echo "*** Test 3 SUCCEEDED — BLOCKSIZE=1024 works globally! ***"
    echo "*** Check resolution/quality before using for production. ***"
    du -h "$WORK/test_outputs/global_b1024.tif"
    $GDAL gdalinfo "$WORK/test_outputs/global_b1024.tif" | head -30
fi

echo ""
echo "All tests done. See summary above."
echo "Next: sbatch make_vrt.sbatch  (then tiles_low → tiles_high → pack_upload)"
