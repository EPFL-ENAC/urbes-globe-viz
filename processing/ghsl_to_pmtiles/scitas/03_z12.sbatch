#!/bin/bash
#SBATCH --job-name=ghsl512_z12
#SBATCH --array=0-15
#SBATCH --cpus-per-task=14
#SBATCH --mem=60G
#SBATCH --time=06:00:00
#SBATCH --account=enac-it4r
#SBATCH --partition=standard
#SBATCH --output=/work/enac-it4r/ghsl/logs/512_z12_%a.log

# Zoom 12 (512 px tiles, max zoom): 16 parallel jobs, one per 22.5° longitude strip.
# Nearest resampling at max zoom (pixel-accurate, faster than average).
# The 256 px z13 strips took 2-4h, so the limit is 6h. Can run in parallel with 02_z8-11.sbatch.
#
# Reads COG from $SCRATCH (all-flash GPFS, fast sequential reads).
# Writes tiles to $TMPDIR (local NVMe) then rsyncs to $SCRATCH/tiles_512/.

WORK=/work/enac-it4r/ghsl
SCRATCH=/scratch/ripoll/ghsl
COG=$SCRATCH/ghsl_built_3857_cog.tif
GDAL="apptainer exec --bind $WORK --bind $SCRATCH --bind $TMPDIR $WORK/gdal.sif"
ID=$SLURM_ARRAY_TASK_ID

LON_MIN=$(python3 -c "print($ID * 22.5 - 180)")
LON_MAX=$(python3 -c "print(($ID + 1) * 22.5 - 180)")
echo "=== Strip $ID: lon $LON_MIN to $LON_MAX ==="

# Clip to this longitude strip
$GDAL gdal_translate \
  -projwin $LON_MIN 85 $LON_MAX -85 \
  -projwin_srs EPSG:4326 \
  -of VRT \
  $COG \
  $TMPDIR/strip.vrt

# Color relief with alpha band
# Note: -alpha must be on the SAME LINE (not a line continuation)
$GDAL gdaldem color-relief $TMPDIR/strip.vrt $WORK/ghsl_colors.txt $TMPDIR/strip_rgba.vrt -of VRT -alpha

mkdir -p $TMPDIR/tiles
time $GDAL gdal2tiles.py \
  --zoom=12 \
  --processes=14 \
  --tilesize=512 \
  --resampling=near \
  --xyz -x \
  --tiledriver=WEBP --webp-quality=85 \
  $TMPDIR/strip_rgba.vrt $TMPDIR/tiles/

echo "Tiles generated: $(find $TMPDIR/tiles -name '*.webp' | wc -l)"

time rsync -a $TMPDIR/tiles/. $SCRATCH/tiles_512/
echo "=== Done strip $ID ==="
