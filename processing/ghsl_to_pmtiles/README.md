# GHSL → PMTiles Pipeline

Converts the GHSL Built Surface 2018 dataset into a PMTiles raster archive served from CDN.

## Why PMTiles (not COG)?

`gdal_translate -of COG -co TILING_SCHEME=GoogleMapsCompatible` crashes at global scale:

```
ERROR 1: TIFFSetupStrips:Too large Strip/Tile Offsets/ByteCounts arrays
```

67M+ tiles at zoom 13 overflows libtiff. No fix exists in GDAL ≤ 3.13. PMTiles pre-renders WebP tiles and packages them into a single file with HTTP range support — no tile server needed.

## Source data

**Machine**: ENACIT4R-CUDA — `/mnt/nvme/urbes-globe-viz/geodata/`

| File                      | Size   | Description                                              |
| ------------------------- | ------ | -------------------------------------------------------- |
| `ghsl_built_3857_cog.tif` | 47 GB  | PRIMARY SOURCE — EPSG:3857, NoData=255                   |
| `ghsl_colors.txt`         | 88 B   | RGBA color ramp (5-column format)                        |
| `ghsl_rgba.vrt`           | 3.5 KB | RGBA VRT from gdaldem — verify SourceFilename before use |

## Pipeline

### 0. Prerequisites

```bash
# Download pmtiles binary (single Go binary, no install needed)
wget https://github.com/protomaps/go-pmtiles/releases/latest/download/go-pmtiles_Linux_x86_64.tar.gz
tar xzf go-pmtiles_Linux_x86_64.tar.gz && mv pmtiles /usr/local/bin/
```

### 1. Color relief VRT (instant)

⚠️ Color file MUST have **5 columns**: `value R G B A`. 4 columns silently maps the last value to Blue → blue artifacts everywhere.

```bash
cd /mnt/nvme/urbes-globe-viz/geodata
gdaldem color-relief ghsl_built_3857_cog.tif ghsl_colors.txt ghsl_rgba.vrt -of VRT -alpha
# GDAL 3.8.4 segfaults on cleanup — harmless, VRT is written correctly
```

### 2. Generate tiles — split zoom strategy

Use `--resampling=average` for low zooms (smooth appearance) and `--resampling=near` for high zooms (fast, quality identical at pixel level). Run in tmux.

```bash
tmux new -s ghsl_tiles

# Low zooms (~30 min) — verify visually before continuing
gdal2tiles.py \
  --zoom=0-8 \
  --processes=14 \
  --resampling=average \
  --xyz -x \
  --tiledriver=WEBP --webp-quality=85 \
  ghsl_rgba.vrt ./ghsl_tiles/ \
  2>&1 | tee tiles_low.log

# High zooms (~8-15 hours) — run after verifying zoom 0-8
gdal2tiles.py \
  --zoom=9-13 \
  --processes=14 \
  --resampling=near \
  --xyz -x \
  --tiledriver=WEBP --webp-quality=85 \
  ghsl_rgba.vrt ./ghsl_tiles/ \
  2>&1 | tee tiles_high.log
```

Notes:

- `-x` skips fully-transparent tiles (skips ~60% of globe = ocean)
- WebP requires 4-band RGBA input — gdaldem `-alpha` provides this
- Do NOT run two gdal2tiles jobs in parallel — `--processes=14` already saturates all CPUs

### 3. Post-process

```bash
# Remove near-empty tiles (saves ~20-30% space)
find ./ghsl_tiles/ -name "*.webp" -size -500c -delete
find ./ghsl_tiles/ -type d -empty -delete

du -sh ./ghsl_tiles/
find ./ghsl_tiles/ -name "*.webp" | wc -l
```

### 4. Package into PMTiles

```bash
# pmtiles converts directly from tile directory — no mb-util needed
pmtiles convert ./ghsl_tiles/ ghsl.pmtiles
```

### 5. Upload to CDN

```bash
s3cmd put ghsl.pmtiles s3://urbes-viz/
# Available at: https://enacit4r-cdn-s3.epfl.ch/urbes-viz/ghsl.pmtiles
```

## Frontend integration (Globe3D.vue)

```typescript
import { Protocol } from "pmtiles";
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

map.addSource("ghsl", {
  type: "raster",
  url: "pmtiles://https://enacit4r-cdn-s3.epfl.ch/urbes-viz/ghsl.pmtiles",
  tileSize: 256,
});
map.addLayer({
  id: "ghsl-layer",
  type: "raster",
  source: "ghsl",
  paint: { "raster-opacity": 0.8 },
});
```
