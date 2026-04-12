# GitHub Copilot Instructions — Urbes Globe Viz

> **LLM instruction**: As you learn new things about this project (architecture decisions, gotchas, conventions, data pipeline details), **update this file and `CLAUDE.md`** to keep them in sync. Both files are the shared memory for all AI assistants working on this project.

---

## Project Overview

**Urbes Globe Viz** is a Vue 3 + MapLibre GL JS research visualization platform for the URBES group at EPFL. It displays geospatial datasets (urban morphology, mobility flows, building heights, etc.) on an interactive 3D globe.

- **Dev**: https://urbes-globe-viz-dev.epfl.ch/ | **Prod**: https://urbes-globe-viz.epfl.ch/
- **Geodata (NAS)**: `https://urbes-viz.epfl.ch/geodata/` (served via nginx from shared EPFL NAS)

## Tech Stack

- **Vue 3** with Composition API (`<script setup>`) and TypeScript
- **Quasar** for UI components
- **MapLibre GL JS** for the map engine
- **Deck.gl** (`@deck.gl/mapbox`) for 3D overlays (arc layers, etc.)
- **`@geomatico/maplibre-cog-protocol`** for streaming COG rasters from CDN
- **Vite** build tool, **ESLint + Prettier** linting, **lefthook** pre-commit hooks

## Code Conventions

- Always use `<script setup lang="ts">` in Vue components
- Use `computed()` and `watch()` from Vue — prefer computed over methods for derived values
- Use Pinia for shared state (`frontend/src/stores/`)
- Prefer `const` over `let`; avoid `any` types
- File naming: components = PascalCase, config/utils = camelCase
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.

## Project Structure

```
frontend/src/
├── components/features/
│   ├── Globe3D.vue          # Main globe + GHSL COG basemap (MapLibre)
│   ├── DaveFlowsMap.vue     # Deck.gl ArcLayer with brushing + dataUrl prop
│   └── ProjectMap.vue       # Generic MapLibre vector/raster renderer
├── config/projects/
│   ├── types.ts             # ProjectConfig + SubViz interfaces — source of truth
│   ├── index.ts             # allProjects: ProjectConfig[] — import this for all projects
│   └── *.ts                 # One file per project dataset
├── pages/
│   ├── GlobeView.vue        # Home view: spinning globe + project cards
│   └── ProjectDetailView.vue # Detail view: left info drawer + full-screen map
└── router/ stores/ composables/ assets/
```

## Data Model

### `ProjectConfig` (in `types.ts`)

Key fields:

- `id`: unique slug, matches GeoJSON/image filenames on CDN
- `coordinates`: `[lng, lat]` — globe camera target
- `source?` + `layer?`: MapLibre source/layer spec (omit for custom renderers)
- `renderer?`: `"deckgl-arcs"` → uses `DaveFlowsMap`; undefined → uses `ProjectMap`
- `subViz?: SubViz[]`: optional array for carousel/scrollytelling multi-dataset projects

### `SubViz` interface

Each sub-viz has `id`, `title`, `description`, and optionally `renderer`, `source`, `layer`, `dataUrl`. Used by `ProjectDetailView` to render a dot-navigation carousel.

**Important**: `ProjectConfig` is never serialized to GeoJSON. Always import `allProjects` from `config/projects/index.ts` to access it at runtime (e.g. in `ProjectDetailView`).

### Adding a Project

1. Create `frontend/src/config/projects/<id>.ts`
2. Export a `ProjectConfig` — see `_example.ts.example` for the template
3. Register in `index.ts` `allProjects` array

## Renderer System

| `renderer`      | Component          | Use case                        |
| --------------- | ------------------ | ------------------------------- |
| _(undefined)_   | `ProjectMap.vue`   | Standard MapLibre source/layer  |
| `"deckgl-arcs"` | `DaveFlowsMap.vue` | OD arc flows (deck.gl ArcLayer) |

`DaveFlowsMap` accepts a `dataUrl` prop. When it changes, it hot-swaps the arc data via `deckOverlay.setProps()` — no map recreation, no camera reset.

## Reusable Time Slider Pattern

- `ProjectConfig` and `SubViz` now support optional `timeControl` metadata (see `frontend/src/config/projects/types.ts`).
- `timeControl` drives a reusable `TimeSlider` UI (`frontend/src/components/common/TimeSlider.vue`) shown in `ProjectDetailView`.
- `ProjectMap.vue` applies time changes by replacing a configured placeholder field (example: `hour_12`) with a generated target field from `fieldTemplate` (example: `hour_{value}`).
- This supports wide-table temporal datasets (`hour_0..hour_23`) without hard-coding dataset logic inside the map component.

## GHSL Raster Basemap (Critical Knowledge)

The globe basemap displays GHSL built-surface data. **COG streaming was attempted but abandoned** due to a hard libtiff crash at global scale — we now use **PMTiles** (pre-rendered WebP raster tiles).

### Why COG failed

`gdal_translate -of COG -co TILING_SCHEME=GoogleMapsCompatible` crashes globally with:

```
ERROR 1: TIFFSetupStrips:Too large Strip/Tile Offsets/ByteCounts arrays
```

67M+ tiles at zoom 13 overflows libtiff's tile offset arrays. No fix exists in GDAL ≤ 3.13, regardless of machine, RAM, or GDAL version.

### PMTiles pipeline (working approach)

Source file on ENACIT4R-CUDA: `/mnt/nvme/urbes-globe-viz/geodata/ghsl_built_3857_cog.tif` (47 GB, EPSG:3857, NoData=255)

**⚠️ Color file format**: entries MUST have 5 columns: `value R G B A`. Using 4 columns silently maps the last number to the Blue channel → blue artifacts everywhere.

```bash
# 1. Color mapping (transparent → white by built-surface density)
cat > ghsl_colors.txt << 'EOF'
nv 255 255 255 0
0 255 255 255 0
1 255 255 255 3
50 255 255 255 128
100 255 255 255 255
EOF

# 2. RGBA VRT (instant, no disk cost)
gdaldem color-relief ghsl_built_3857_cog.tif ghsl_colors.txt ghsl_rgba.vrt -of VRT -alpha

# 3. Generate WebP tiles (run on haas044: 32 threads, 251 GB RAM)
gdal2tiles.py --zoom=0-12 --processes=30 --resampling=near --xyz \
  -x --tiledriver=WEBP --webp-quality=85 ghsl_rgba.vrt ./ghsl_tiles/
# Post-process: remove near-empty tiles
find ./ghsl_tiles/ -name "*.webp" -size -500c -delete

# 4. Package into PMTiles
pip install mbutil
mb-util --image_format=webp --scheme=xyz ./ghsl_tiles/ ghsl.mbtiles
pmtiles convert ghsl.mbtiles ghsl.pmtiles
s3cmd put ghsl.pmtiles s3://urbes-viz/
```

### Frontend integration (Globe3D.vue)

```typescript
import { Protocol } from "pmtiles";
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
map.addSource("ghsl", {
  type: "raster",
  url: "pmtiles://https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles",
  tileSize: 256,
});
map.addLayer({
  id: "ghsl-layer",
  type: "raster",
  source: "ghsl",
  paint: { "raster-opacity": 0.8 },
});
```

### GDAL segfaults on GDAL 3.8.4 (ubuntugis PPA)

Both haas044 and ENACIT4R-CUDA have harmless cleanup segfaults after gdalwarp/gdaldem/gdalinfo. The output files are written correctly before the crash — ignore these.

## Pre-commit Hooks

- lefthook runs prettier on staged files
- If a file has both staged and unstaged changes, lefthook stashes the unstaged diff as a patch. If prettier reformats the staged content, the patch re-apply fails → **always `git add` the full file before committing**
- Files matching `*.example` are excluded from prettier (see `.prettierignore`)
