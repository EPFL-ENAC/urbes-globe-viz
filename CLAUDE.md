# CLAUDE.md — Urbes Globe Viz

> **LLM instruction**: As you learn new things about this project (architecture decisions, gotchas, conventions, data pipeline details), **update this file and `.github/copilot-instructions.md`** to keep them in sync. Both files are the shared memory for all AI assistants working on this project.

---

## Project Purpose

**Urbes Globe Viz** is a research visualization platform built at EPFL to display outputs from the URBES research group. It renders geospatial datasets (urban morphology, mobility flows, building heights, etc.) on an interactive 3D globe.

- **Dev URL**: https://urbes-globe-viz-dev.epfl.ch/
- **Prod URL**: https://urbes-globe-viz.epfl.ch/
- **GitHub**: https://github.com/EPFL-ENAC/urbes-globe-viz
- **Geodata (NAS)**: `https://urbes-viz.epfl.ch/geodata/` (served via nginx from shared EPFL NAS)
- **CDN (deprecated)**: `https://enacit4r-cdn-s3.epfl.ch/urbes-viz/` — old S3 CDN, do not use for new data

## Tech Stack

| Layer                | Technology                         |
| -------------------- | ---------------------------------- |
| Frontend framework   | Vue 3 + TypeScript                 |
| UI components        | Quasar                             |
| Map engine           | MapLibre GL JS                     |
| 3D overlays          | Deck.gl (via `@deck.gl/mapbox`)    |
| COG raster streaming | `@geomatico/maplibre-cog-protocol` |
| Build tool           | Vite                               |
| Linting/formatting   | ESLint + Prettier                  |
| Pre-commit hooks     | lefthook                           |
| Web server           | nginx (Docker)                     |
| Reverse proxy        | Traefik                            |

## Project Structure

```
urbes-globe-viz/
├── frontend/
│   └── src/
│       ├── components/features/   # Map renderers
│       │   ├── Globe3D.vue        # Main globe + GHSL COG basemap
│       │   ├── DaveFlowsMap.vue   # Deck.gl ArcLayer renderer
│       │   └── ProjectMap.vue     # Generic MapLibre renderer
│       ├── config/projects/       # Per-project data configs
│       │   ├── types.ts           # ProjectConfig + SubViz interfaces
│       │   ├── index.ts           # Exports allProjects array
│       │   ├── dave_flows.ts      # Example with subViz
│       │   └── *.ts               # One file per project
│       ├── pages/
│       │   ├── GlobeView.vue      # Home: spinning globe with project cards
│       │   └── ProjectDetailView.vue  # Project detail: left drawer + map
│       ├── stores/                # Pinia stores
│       └── router/
├── processing/                    # Python data-pipeline scripts
│   ├── dave_flows/
│   ├── ghsl_to_pmtiles/
│   ├── martin_building_heights/
│   └── cookbook/                  # Reusable GDAL recipes
└── Makefile                       # install / lint / format / clean
```

## Dev Commands

```bash
make install   # npm install (frontend)
make lint      # eslint + prettier check
make format    # prettier --write
# Frontend dev server:
cd frontend && npm run dev    # http://localhost:9000
cd frontend && npm run build  # production build
```

## Adding a New Project

1. Create `frontend/src/config/projects/<id>.ts` (see `_example.ts.example`)
2. Export a `ProjectConfig` object — fill `id`, `coordinates`, `title`, `description`, `category`, `year`, `unit`, `info`
3. Add the appropriate `source` + `layer` (MapLibre) OR `renderer` (custom) field
4. Import and add to `allProjects` in `index.ts`

### Renderer options

| `renderer` value | Component used     | Use case                               |
| ---------------- | ------------------ | -------------------------------------- |
| _(undefined)_    | `ProjectMap.vue`   | Standard MapLibre vector/raster layers |
| `"deckgl-arcs"`  | `DaveFlowsMap.vue` | Origin-destination arc flows           |

### Sub-visualizations (`subViz`)

If a project has multiple related datasets (e.g. work/outdoor/leisure flows), add a `subViz` array to `ProjectConfig`. Each entry has its own `title`, `description`, and optionally its own `renderer` / `dataUrl`. `ProjectDetailView` renders dot-navigation carousel + scroll to switch between sub-vizs. The top-level `source/layer/renderer` is still used for the globe card preview.

```typescript
subViz: [
  {
    id: "work",
    title: "Work Flows",
    description: "...",
    renderer: "deckgl-arcs",
    dataUrl: "dave_flows_work.geojson",
  },
  {
    id: "outdoor",
    title: "Outdoor Flows",
    description: "...",
    renderer: "deckgl-arcs",
    dataUrl: "dave_flows_outdoor.geojson",
  },
];
```

## Reusable Time Slider Pattern

- `ProjectConfig` and `SubViz` support optional `timeControl` metadata (`frontend/src/config/projects/types.ts`).
- `ProjectDetailView.vue` renders `frontend/src/components/common/TimeSlider.vue` when `timeControl` exists.
- `ProjectMap.vue` updates temporal layers by replacing a configured placeholder field (for example `hour_12`) with a target field generated from `fieldTemplate` (for example `hour_{value}`).
- This avoids per-dataset map logic and enables reuse for other wide-table temporal datasets.

## Key Architectural Decisions

- **`ProjectConfig` lives only in TypeScript** — it is never serialized to GeoJSON properties. `ProjectDetailView` imports `allProjects` directly to access `subViz`.
- **Hot-swap arc data** — `DaveFlowsMap` watches a `dataUrl` prop; on change it calls `deckOverlay.setProps()` to swap data without recreating the map or losing camera state.
- **GHSL as COG basemap** — Globe3D streams the GHSL built-surface raster directly from CDN using `@geomatico/maplibre-cog-protocol`. Requires EPSG:3857 + `GoogleMapsCompatible` tiling scheme. ⚠️ COG generation at global scale crashes with a hard libtiff limit (TIFFSetupStrips overflow at 67M+ tiles) — see GHSL PMTiles section below for the working alternative.

## GHSL Dataset (Built Surface 2018)

- **Source file**: `GHS_BUILT_S_E2018_GLOBE_R2023A_54009_10_V1_0.tif` (61 GB, Mollweide EPSG:54009, 10 m resolution)
- **Values**: 0–100 m² of built surface per 10 m cell (uint8). NoData = 255.
- **Real max**: ~38 (observed in QGIS). `gdalinfo` approximate stats claimed max=9 — **never trust `STATISTICS_APPROXIMATE`**.
- **Browser target file**: `ghsl_built_3857_cog.tif` hosted on CDN

### COG encoding (browser-compatible)

`@geomatico/maplibre-cog-protocol` + `geotiff.js` constraints:

| Option          | Value                  | Reason                                                                            |
| --------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `TILING_SCHEME` | `GoogleMapsCompatible` | Aligns overview pyramid to web tile grid → ~64 KB byte ranges (vs 841 MB without) |
| `BLOCKSIZE`     | `512`                  | 256 crashes libtiff at zoom-14 globally (268M tiles). With 512: use ZOOM_LEVEL=13 (also 67M tiles, same 9.55 m/px) |
| `COMPRESS`      | `DEFLATE`              | geotiff.js does NOT support ZSTD (error 50000) or LERC                            |
| `LEVEL`         | `6`                    | Good deflate ratio                                                                |
| `PREDICTOR`     | `2`                    | Integer data predictor                                                            |
| `SPARSE_OK`     | `TRUE`                 | 62% of globe is NoData — skips empty tiles                                        |
| `ZOOM_LEVEL`    | `13`                   | With BLOCKSIZE=512: zoom 13 = 9.55 m/px (= BLOCKSIZE=256+zoom14). zoom 14 would give 4.77 m/px AND 268M tiles → crashes globally |
| ~~`NBITS=4`~~   | ❌ NEVER               | Real max is 38, not 9 — clips values 16–38, causing artifacts in dense cities     |

### GDAL command skeleton — VRT approach (preferred, no intermediate file)

> **Critical**: `gdalwarp -of COG -co TILING_SCHEME=...` silently ignores `TILING_SCHEME`.
> The VRT approach avoids this AND avoids a 40GB+ intermediate file.
> `-wm` (warp working memory) is **separate** from `GDAL_CACHEMAX` — default is only 64MB, causing gdalwarp to process in thousands of tiny chunks.
> Even in VRT mode, `-wm` is written to `<WarpMemoryLimit>` in the XML and used by `gdal_translate` when it executes the warp — so set it high.
> `-multi` adds a dedicated I/O thread alongside computation (combine with `-wo NUM_THREADS`).
> Always specify `-tr` explicitly to avoid gdalwarp's slow auto-resolution computation on global datasets.

```bash
# Step 1 — instant: writes an XML plan, no computation
# -wm is baked into <WarpMemoryLimit> in the VRT XML → used during gdal_translate
gdalwarp \
  input_mollweide.tif \
  intermediate.vrt \
  -of VRT \
  -t_srs EPSG:3857 \
  -r near \
  -tr 9.554628535 9.554628535 \
  -te -20037508.3428 -20037508.3428 20037508.3428 20037508.3428 \
  -ot Byte \
  -srcnodata 255 \
  -dstnodata 0 \
  -wm 8192 \
  -multi \
  -wo NUM_THREADS=14

# Step 2 — does the real warp + COG encoding in one pass
# gdal_translate on a VRT properly applies TILING_SCHEME ✅
gdal_translate \
  intermediate.vrt \
  output_cog.tif \
  -of COG \
  -co TILING_SCHEME=GoogleMapsCompatible \
  -co BLOCKSIZE=512 \
  -co ZOOM_LEVEL=13 \
  -co COMPRESS=DEFLATE \
  -co LEVEL=6 \
  -co PREDICTOR=2 \
  -co OVERVIEW_RESAMPLING=NEAR \
  -co SPARSE_OK=TRUE \
  -co BIGTIFF=YES \
  --config GDAL_CACHEMAX 8192 \
  --config GDAL_NUM_THREADS 14 \
  2>&1 | tee translate.log

# Verify tiling scheme was applied — must show NAME=GoogleMapsCompatible
gdalinfo output_cog.tif | grep -A3 "Tiling"
```

### Zoom level → target resolution (`-tr`) reference

| Zoom | `-tr` value (m) | Notes                    |
| ---- | --------------- | ------------------------ |
| 13   | `19.1093`       | GDAL AUTO for 10m source |
| 14   | `9.554628535`   | Exact zoom-13+BLOCKSIZE=512 grid size (= 2πR / 2^13 / 512). Using `9.5546` gives 4,194,317 px instead of 4,194,304 → GDAL bumps to zoom-14 → crash |
| 15   | `4.7773`        | Oversampling             |

### Zoom level reference (EPSG:3857 at equator)

| Zoom | m/pixel | Ground res at 47°N                |
| ---- | ------- | --------------------------------- |
| 13   | 19.1 m  | ~13 m (GDAL AUTO for 10 m source) |
| 14   | 9.55 m  | ~6.5 m (recommended)              |
| 15   | 4.77 m  | oversampling                      |

## Data Processing (Remote Machine: ENACIT4R-CUDA)

- NVMe geodata path: `/mnt/nvme/urbes-globe-viz/geodata/`
- Use **tmux** for long jobs: `tmux new -s <name>` / detach: `Ctrl+B D`
- Max safe CPUs: 14 (shared machine — check with `nproc` first)
- `GDAL_DATA` is not set → `WebMercatorQuad` tiling scheme fails; use `GoogleMapsCompatible` instead
- Log long jobs: `command 2>&1 | tee output.log`
- Upload to CDN: `s3cmd put file.tif s3://urbes-viz/`

## GHSL PMTiles Generation (Working Alternative to COG)

### Why not COG?

`gdal_translate -of COG -co TILING_SCHEME=GoogleMapsCompatible` crashes at global scale with:
```
ERROR 1: TIFFSetupStrips:Too large Strip/Tile Offsets/ByteCounts arrays
```
This is a hard libtiff limit — 67M+ tiles at zoom 13 (BLOCKSIZE=512) overflows tile offset arrays. No fix exists in GDAL through 3.13, regardless of RAM, machine, or GDAL version.

### PMTiles approach

Pre-render RGBA WebP tiles via `gdal2tiles.py`, package into a single `.pmtiles` file served from CDN via HTTP range requests. MapLibre uses the `pmtiles` JS protocol plugin.

### Source file on ENACIT4R-CUDA

- **Path**: `/mnt/nvme/urbes-globe-viz/geodata/ghsl_built_3857_cog.tif`
- **Size**: 47 GB, EPSG:3857, ~18 m/px, **NoData = 255** (not 0!)
- This file was created without `TILING_SCHEME` — not suitable for COG streaming but perfect as gdal2tiles input

### Step 1 — Color mapping file

⚠️ **Critical**: color entries must have **5 columns**: `value R G B A`. Using 4 columns (`value R G B`) silently maps the last number to Blue, causing blue artifacts everywhere.

```bash
cat > ghsl_colors.txt << 'EOF'
nv 255 255 255 0
0 255 255 255 0
1 255 255 255 3
50 255 255 255 128
100 255 255 255 255
EOF
```

This maps: nodata/0 → transparent white, 1–100 → white with increasing opacity.

### Step 2 — RGBA VRT via gdaldem

```bash
gdaldem color-relief \
  ghsl_built_3857_cog.tif \
  ghsl_colors.txt \
  ghsl_rgba.vrt \
  -of VRT -alpha
```

Note: GDAL 3.8.4 (ubuntugis PPA) segfaults on cleanup — harmless, the VRT is written correctly before the crash.

### Step 3 — Generate tiles (split-zoom strategy)

Use `--resampling=average` for low zooms (smoother appearance, avoids white-dot artifacts) and `--resampling=near` for high zooms (fast, pixel-accurate).

```bash
# Low zooms (~30 min) — verify visually before continuing
gdal2tiles.py \
  --zoom=0-8 \
  --processes=14 \
  --resampling=average \
  --xyz -x \
  --tiledriver=WEBP --webp-quality=85 \
  ghsl_rgba.vrt ./ghsl_tiles/ \
  2>&1 | tee tiles_low.log

# High zooms (~8-15 hours)
gdal2tiles.py \
  --zoom=9-13 \
  --processes=14 \
  --resampling=near \
  --xyz -x \
  --tiledriver=WEBP --webp-quality=85 \
  ghsl_rgba.vrt ./ghsl_tiles/ \
  2>&1 | tee tiles_high.log

# Post-process: remove near-empty tiles
find ./ghsl_tiles/ -name "*.webp" -size -500c -delete
find ./ghsl_tiles/ -type d -empty -delete
```

- `-x` skips fully-transparent tiles (ocean), but tiles with even 1 built pixel are kept
- WebP works because gdaldem outputs 4-band RGBA (WebP requires 3 or 4 bands)
- Do NOT run two gdal2tiles jobs in parallel — `--processes=14` already saturates all CPUs

### Step 4 — Package into PMTiles

`mb-util` is deprecated. Use GDAL's built-in MBTiles driver instead (no extra install):

```bash
# Option A: GDAL MBTiles driver (skips tile directory entirely — faster)
gdal_translate ghsl_rgba.vrt ghsl.mbtiles \
  -of MBTiles -co TILE_FORMAT=WEBP -co QUALITY=85
gdaladdo ghsl.mbtiles 2 4 8 16 32 64 128 256 512 1024 2048 4096
pmtiles convert ghsl.mbtiles ghsl.pmtiles

# Option B: pack existing tile directory with stdlib Python (no extra deps)
# See processing/ghsl_to_pmtiles/pack_mbtiles.py
python3 pack_mbtiles.py ./ghsl_tiles/ ghsl.mbtiles
pmtiles convert ghsl.mbtiles ghsl.pmtiles

s3cmd put --acl-public --guess-mime-type ghsl.pmtiles s3://urbes-viz/
# --acl-public is REQUIRED — without it files are private and return 403
```

### Step 5 — Frontend integration (Globe3D.vue)

```typescript
import { Protocol } from 'pmtiles';
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

map.addSource('ghsl', {
  type: 'raster',
  url: 'pmtiles://https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles',
  tileSize: 256,
});
map.addLayer({ id: 'ghsl-layer', type: 'raster', source: 'ghsl',
  paint: { 'raster-opacity': 0.8 }
});
```

### Machine notes

- **ENACIT4R-CUDA**: source data at `/mnt/nvme/urbes-globe-viz/geodata/`, 14 CPUs, 28 GB RAM, NVMe fast
- **haas044.rcp.epfl.ch**: 32 threads, 251 GB RAM, 216 GB disk — use for heavy processing
- Both machines have GDAL 3.8.4 (ubuntugis PPA) with harmless cleanup segfaults

## Pre-commit Hooks (lefthook)

- lefthook stashes unstaged changes as a patch before running prettier, then re-applies
- If prettier reformats a file that had mixed staged/unstaged state, the patch re-apply fails → **stage all changes to a file before committing**
- `*.example` files (like `_example.ts.example`) are excluded from prettier via `.prettierignore`
