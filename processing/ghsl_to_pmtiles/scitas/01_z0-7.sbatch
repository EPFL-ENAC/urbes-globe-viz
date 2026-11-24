#!/bin/bash
#SBATCH --job-name=ghsl512_z0-7
#SBATCH --cpus-per-task=20
#SBATCH --mem=120G
#SBATCH --time=00:30:00
#SBATCH --account=enac-it4r
#SBATCH --partition=standard
#SBATCH --output=/work/enac-it4r/ghsl/logs/512_z0-7.log

# Zoom 0-7, 512 px tiles: global, single job.
# Average resampling avoids white-dot artifacts at low zoom.
#
# Writes tiles to $TMPDIR (local NVMe) then rsyncs to $SCRATCH.
# Do NOT write directly to $SCRATCH — millions of small files stall GPFS at ~60%.

WORK=/work/enac-it4r/ghsl
SCRATCH=/scratch/ripoll/ghsl
GDAL="apptainer exec --bind $WORK --bind $SCRATCH --bind $TMPDIR $WORK/gdal.sif"

echo "=== Copying COG to TMPDIR (local NVMe) ==="
cp $SCRATCH/ghsl_built_3857_cog.tif $TMPDIR/
COG=$TMPDIR/ghsl_built_3857_cog.tif
echo "Copy done. $(du -sh $COG | cut -f1)"

echo "=== Creating RGBA VRT ==="
# Note: -alpha must be on the SAME LINE — a line continuation before -alpha
# causes the shell to treat it as a command, silently dropping the alpha band.
$GDAL gdaldem color-relief $COG $WORK/ghsl_colors.txt $TMPDIR/ghsl_rgba.vrt -of VRT -alpha
# GDAL 3.8.4 may segfault on cleanup here — harmless, VRT is written before crash.

echo "=== Generating 512 px tiles zoom 0-7 ==="
mkdir -p $TMPDIR/tiles
$GDAL gdal2tiles.py \
  --zoom=0-7 \
  --processes=20 \
  --tilesize=512 \
  --resampling=average \
  --xyz -x \
  --tiledriver=WEBP --webp-quality=85 \
  $TMPDIR/ghsl_rgba.vrt $TMPDIR/tiles/

echo "Tiles generated: $(find $TMPDIR/tiles -name '*.webp' | wc -l)"

echo "=== Rsyncing to scratch ==="
rsync -a --exclude="*.html" --exclude="*.mapml" $TMPDIR/tiles/ $SCRATCH/tiles_512/
echo "=== Done ==="
