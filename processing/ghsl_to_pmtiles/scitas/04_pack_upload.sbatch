#!/bin/bash
#SBATCH --job-name=ghsl512_pack
#SBATCH --cpus-per-task=16
#SBATCH --mem=32G
#SBATCH --time=04:00:00
#SBATCH --account=enac-it4r
#SBATCH --partition=standard
#SBATCH --output=/work/enac-it4r/ghsl/logs/512_pack.log

# Pack all tiles into MBTiles, convert to PMTiles, copy to persistent storage.
# Run after all tile generation jobs are complete.
#
# Steps:
#   1. Filter near-empty tiles (<225 bytes — WebP minimum is 224 bytes)
#   2. Pack tile directory → MBTiles  (16 parallel readers, ~21 min for 5.4M tiles)
#   3. Convert MBTiles → PMTiles      (~2 min)
#   4. Copy to $WORK (persistent) and $SCRATCH (quick access)
#
# The NAS upload is a manual step after this job, see ../README.md.
#
# All intermediate files written to $TMPDIR (local NVMe) for SQLite performance.
# Final .pmtiles is also copied to /work/enac-it4r/ghsl/ to survive the 30-day
# $SCRATCH purge.

WORK=/work/enac-it4r/ghsl
SCRATCH=/scratch/ripoll/ghsl
TILES=$SCRATCH/tiles_512

echo "=== Tile counts before cleanup ==="
for z in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
  count=$(find $TILES/$z -name "*.webp" 2>/dev/null | wc -l)
  echo "  zoom $z: $count"
done

echo ""
echo "=== Filter near-empty tiles (<225 bytes) ==="
# Run ONLY after all generation jobs are done — deletes tiles written mid-job otherwise
find $TILES -name "*.webp" -size -225c -delete
find $TILES -type d -empty -delete
echo "Total after cleanup: $(find $TILES -name '*.webp' | wc -l) tiles"

echo ""
echo "=== Pack tiles → MBTiles (writing to local NVMe) ==="
# pack_mbtiles.py uses 16 parallel readers for GPFS throughput
# Progress printed every 50K tiles with rate and ETA
python3 $WORK/pack_mbtiles.py $TILES $TMPDIR/ghsl-512.mbtiles 16
echo "MBTiles size: $(du -sh $TMPDIR/ghsl-512.mbtiles | cut -f1)"

echo ""
echo "=== Convert MBTiles → PMTiles ==="
$WORK/pmtiles convert $TMPDIR/ghsl-512.mbtiles $TMPDIR/ghsl-512.pmtiles
echo "PMTiles size: $(du -sh $TMPDIR/ghsl-512.pmtiles | cut -f1)"
$WORK/pmtiles show $TMPDIR/ghsl-512.pmtiles

echo ""
echo "=== Copy to persistent storage ==="
cp $TMPDIR/ghsl-512.pmtiles $WORK/ghsl-512.pmtiles
echo "  /work: $(du -sh $WORK/ghsl-512.pmtiles | cut -f1)"
cp $TMPDIR/ghsl-512.pmtiles $SCRATCH/ghsl-512.pmtiles
echo "  /scratch: $(du -sh $SCRATCH/ghsl-512.pmtiles | cut -f1)"

echo ""
echo "=== All done ==="
echo "Next: copy $WORK/ghsl-512.pmtiles to the NAS, see processing/ghsl_to_pmtiles/README.md"
