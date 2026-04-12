Goal
Transform the GHSL (Global Human Settlement Layer) Built Surface 2018 dataset into a web-ready PMTiles file that can be served from the EPFL CDN and visualised on the interactive globe in the urbes-globe-viz frontend.
Instructions

- Run everything on ENACIT4R-CUDA (/mnt/nvme/urbes-globe-viz/geodata/), 14 CPUs, 637 GB free on NVMe
- Use a split zoom approach: --resampling=average for zoom 0–8 (smooth low-zoom appearance), --resampling=near for zoom 9–13 (fast, quality identical at high zoom)
- Use WebP tiles (--tiledriver=WEBP --webp-quality=85) with the -x flag to skip fully-transparent ocean tiles
- Use RGBA white opacity gradient color ramp (5-column format: value R G B A) — already confirmed correct on the machine at ghsl_colors.txt
- Run tile generation in tmux (tmux new -s ghsl_tiles) so it survives disconnection
- After zoom 0–8 finishes (~30 min), visually verify tiles before launching zoom 9–13 (~8–15 hours)
- Post-process: delete near-empty tiles (-size -500c) to save ~20–30% space
- Final pipeline: MBTiles (via mb-util) → PMTiles (via pmtiles convert) → CDN upload (s3cmd put)
- NAS target: upload to shared EPFL NAS geodata/ folder → https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles
- Do not update Globe3D.vue as part of this task (user will handle frontend separately)
  Discoveries
- ghsl_built_3857_cog.tif (47 GB, EPSG:3857, NoData=255) already exists on ENACIT4R-CUDA — no need to re-run gdalwarp
- ghsl_rgba.vrt (3.5 KB, Feb 26 18:38) already exists and was generated from ghsl_built_3857_cog.tif + ghsl_colors.txt — verify its SourceFilename before starting tiles: head -5 ghsl_rgba.vrt
- ghsl_colors.txt already on machine with correct 5-column RGBA format:
  nv 255 255 255 0
  0 255 255 255 0
  1 255 255 255 3
  50 255 255 255 128
  100 255 255 255 255
  - Current ghsl_tiles/ is stale: contains only zoom 0–4, PNG format (not WebP) — must be deleted and regenerated
- --resampling=near causes sparse white dot artifacts at low zoom in rural areas — average fixes this with only ~10–20% total time penalty since low-zoom tiles are few
- Keeping RGBA transparency is more compact than RGB black background, because -x skips ~60% of the globe (ocean tiles never written at all)
- Two parallel tmux sessions is not recommended: both jobs use --processes=14 which already saturates all 14 CPUs; zoom 0–8 is only ~30 min vs 8–15 h for zoom 9–13, so parallelising saves <0.3% of total time
- Color ramp must have 5 columns (value R G B A) — 4 columns silently maps the last number to Blue, causing visual corruption
- gdal_translate -of COG -co TILING_SCHEME=GoogleMapsCompatible crashes at global scale with TIFFSetupStrips libtiff overflow — this is why PMTiles was chosen over COG for the global dataset
- ghsl_built_3857_cog_v2.tif (19 GB, Feb 26) also exists on the machine — origin unclear, do not use as source without investigation
- GDAL 3.8.4 (ubuntugis PPA) may segfault on gdaldem cleanup — harmless, VRT is written correctly before crash
  Accomplished
- ✅ Confirmed disk space: 637 GB free on /mnt/nvme — sufficient for zoom 0–13 tiles (~15–40 GB) + MBTiles + PMTiles
- ✅ Confirmed ghsl_colors.txt is correct on the remote machine
- ✅ Confirmed ghsl_rgba.vrt exists and was generated from the right source
- ✅ Decided on split zoom strategy (average 0–8 / near 9–13) and WebP format
- ✅ Created processing/ghsl_to_pmtiles/ghsl_colors.txt in the local repo (matches what's on the machine)
- ⏳ In progress: rewriting processing/ghsl_to_pmtiles/Makefile — was interrupted, not yet saved
- ❌ processing/ghsl_to_pmtiles/README.md — needs rewriting with final pipeline
- ❌ CLAUDE.md — needs updating with split-zoom approach and final PMTiles pipeline details
- ❌ convert.sh — obsolete, should be deleted
- ❌ Tile generation has not started yet — current ghsl_tiles/ must be deleted and regenerated
  What to do next (exact commands for ENACIT4R-CUDA)

# 1. Start tmux

tmux new -s ghsl_tiles
cd /mnt/nvme/urbes-globe-viz/geodata

# 2. Verify VRT source

head -5 ghsl_rgba.vrt # must show ghsl_built_3857_cog.tif as SourceFilename

# 3. Delete stale tiles

rm -rf ./ghsl_tiles/

# 4. Low zooms (~30 min) — run first and verify visually

gdal2tiles.py \
 --zoom=0-8 \
 --processes=14 \
 --resampling=average \
 --xyz \
 -x \
 --tiledriver=WEBP \
 --webp-quality=85 \
 ghsl_rgba.vrt \
 ./ghsl_tiles/ \
 2>&1 | tee tiles_low.log

# 5. After verifying zoom 0-8 tiles look correct, run high zooms (~8-15 hours)

gdal2tiles.py \
 --zoom=9-13 \
 --processes=14 \
 --resampling=near \
 --xyz \
 -x \
 --tiledriver=WEBP \
 --webp-quality=85 \
 ghsl_rgba.vrt \
 ./ghsl_tiles/ \
 2>&1 | tee tiles_high.log

# 6. Post-process

find ./ghsl*tiles -name "*.webp" -size -500c -delete
find ./ghsl*tiles -type d -empty -delete
du -sh ./ghsl_tiles && find ./ghsl_tiles -name "*.webp" | wc -l

# 7. MBTiles

mb-util --image_format=webp --scheme=xyz ./ghsl_tiles/ ghsl.mbtiles

# 8. PMTiles

pmtiles convert ghsl.mbtiles ghsl.pmtiles

# 9. Upload

s3cmd put ghsl.pmtiles s3://urbes-viz/
Relevant files / directories
urbes-globe-viz/
├── CLAUDE.md # Canonical knowledge base — needs update with split-zoom approach
├── processing/ghsl_to_pmtiles/
│ ├── Makefile # NEEDS REWRITE (old paths, wrong approach)
│ ├── convert.sh # OBSOLETE — delete
│ ├── README.md # NEEDS REWRITE
│ ├── ghsl_colors.txt # ✅ Created/correct (white RGBA opacity gradient)
│ └── ghsl_built.mbtiles # Old partial artifact — can be deleted
└── frontend/src/components/features/Globe3D.vue # Currently uses COG Switzerland clip — will need updating later (out of scope for now)

# On ENACIT4R-CUDA: /mnt/nvme/urbes-globe-viz/geodata/

├── ghsl_built_3857_cog.tif # 47 GB — PRIMARY SOURCE for tile generation
├── ghsl_rgba.vrt # 3.5 KB — RGBA VRT, already correct, verify SourceFilename
├── ghsl_colors.txt # 88 bytes — correct 5-col RGBA color ramp
├── ghsl_tiles/ # STALE — zoom 0-4 PNG only, must delete and regenerate
├── tiles.log # Log from last (incomplete) run
└── ghsl_built_3857_cog_v2.tif # 19 GB — unknown origin, do not use
