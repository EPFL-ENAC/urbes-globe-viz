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
- `zoom?` + `pitch?`: full-view camera when the project is opened in detail view
- `previewZoom?`: zoom used for the globe hover preview. Leave undefined to fall back to `zoom - PREVIEW_ZOOM_OFFSET` (defined in `Globe3D.vue`). Set a per-project value when the offset default zooms in too far or not far enough (e.g. very low base `zoom`)
- `source?` + `layer?`: MapLibre source/layer spec (omit for custom renderers)
- `cardImage?`: curated, hand-picked thumbnail for the **project card** only. File lives at `public/previews/cards/<cardImage>` (theme-independent). Distinct from the auto-generated globe overlay. See **Project Previews**
- `renderer?`: `"deckgl-arcs"` → uses `DaveFlowsMap`; undefined → uses `ProjectMap`
- `subViz?: SubViz[]`: optional array for carousel/scrollytelling multi-dataset projects

### `SubViz` interface

Each sub-viz has `id`, `title`, `description`, and optionally `renderer`, `source`, `layer`, `dataUrl`. Used by `ProjectDetailView` to render a dot-navigation carousel.

### Description rendering

`description` (on both `ProjectConfig` and `SubViz`) is rendered as **Markdown** with inline HTML allowed, via `markdown-it` + `v-html` in `ProjectDetailView.vue`. All three styles are valid in the same field:

- Plain prose: `"Swiss building footprints"`
- Markdown syntax: `"Swiss _building_ footprints, see [source](url)"` (worked example: `car_road_length.ts`)
- Raw HTML: `"<p>Swiss <em>building</em> footprints</p>"` (worked example: `roads_swiss_statistics.ts`)

For visual coherency across projects, stick to normal / italic / links and avoid bold emphasis in description copy.

`markdown-it` is configured in `src/utils/markdown.ts` with `html: true, linkify: true, typographer: false`. No runtime sanitization - descriptions live in committed TS reviewed via PR.

For charts or other interactive per-project content, set `descriptionComponent: () => import("./descriptions/<id>.vue")`. When present, it overrides `description` at render time (wrapped with `defineAsyncComponent`). Custom description SFCs live in `frontend/src/config/projects/descriptions/`, one file per project or subViz named to match the config id (worked example: `descriptions/wrf_d02.vue` with ECharts). The SFC's root inherits the body styling via attribute fallthrough, so keep it single-root.

**Important**: `ProjectConfig` is never serialized to GeoJSON. Always import `allProjects` from `config/projects/index.ts` to access it at runtime (e.g. in `ProjectDetailView`).

### Adding a Project

1. Create `frontend/src/config/projects/<id>.ts`
2. Export a `ProjectConfig` — see `_example.ts.example` for the template
3. Register in `index.ts` `allProjects` array

### Project Previews

Two separate, independent things:

1. **Card thumbnails** (`ProjectCard.vue`) - curated, hand-picked images you choose. Drop a source image (any size/format) at `frontend/card-images/<id>.<ext>`, then `npm run card-images` (sharp; `scripts/process-card-images.mjs`) square-crops it and writes `public/previews/cards/<id>.webp` (512px). Set `cardImage: "<id>.webp"` on the config; `ProjectCard.vue` serves `public/previews/cards/<cardImage>`. Sources stay in `card-images/` (committed, not shipped) so only the lean webp lands in `public/`. The card applies a duotone-purple CSS filter at display time, so source colour doesn't matter. Theme-independent. Omit `cardImage` to render an empty styled box.

2. **Globe hover overlays** (`useMapPreview.ts`) - auto-generated, lightweight, transparent **data-only** PNGs shown over the globe basemap on hover, so the globe never loads the heavy PMTiles/COG dataset just to preview. Files: `public/previews/<id>.png` plus `public/previews/manifest.json` (`{ <id>: { camera: { center, zoom, pitch, bearing }, size } }`). The image is captured at the project's **real camera pose** (its detail-view pitch/zoom), so the 3D perspective is baked into the pixels. On hover, `Globe3D.vue` flies the live globe to that exact `camera`, and `useMapPreview.add()` mounts the PNG as a screen-space DOM `<img>` **billboard** (not a MapLibre source): it is pinned to `map.project(camera.center)` and scaled by `2^(liveZoom - camera.zoom)`, recomputed on every `move`, so it tracks the globe like it's painted on it. `size` is the logical-px side of the square capture viewport - what lets the runtime rescale the image to any live zoom. The billboard is revealed (fade-in) only on `moveend` once the flight has settled at the capture pose (`isSettledAtCapture`: zoom match + a `project`→`unproject` round-trip on the center to reject points behind the globe), so it only ever shows perfectly aligned, never mid-flight or over the wrong hemisphere. Because the basemap is excluded and layer colours are theme-independent hex, **one PNG serves both themes** - the live globe basemap shows through the transparent areas.

Regenerate overlays with `npm run previews` (in `frontend/`), a Playwright + sharp script (`scripts/generate-previews.mjs`) that screenshots each project's map view at its real pose and writes a 1024px transparent PNG. Pass project ids to limit the run: `npm run previews -- wrf buildings` (merges into the existing manifest). It needs a running app server with geodata access - dev server (default `http://localhost:5173`) or a `vite preview` build via `PREVIEW_BASE_URL`. The app cooperates through `?preview=1` (`src/utils/previewMode.ts`): chrome **and basemap** are hidden, page backgrounds are dropped (App.vue clears html+body; ProjectDetailView clears the root) so Playwright's `omitBackground` yields true alpha, and on idle the map sets `window.__previewReady` + `window.__previewCamera = { center, zoom, pitch, bearing }`. Both `ProjectMap.vue` (globe projection, real pitch) and `CogRasterMap.vue` (deck.gl COG, e.g. `wrf`; kept on mercator - the overlay doesn't sync to globe and its projects sit at high enough zoom that it's negligible) emit these hooks; the DAVE flows renderer still needs its own and is not captured.

### Updating a geodata file (cache busting)

**Do not overwrite a geodata file in place under the same name.** nginx serves the new
bytes immediately, but it stamps non-GHSL files with `Cache-Control: max-age=2592000`
(30 days, see `configmap-nginx-geodata.yaml`), so anyone who already loaded the old file
keeps the stale copy for up to 30 days unless they hard-refresh.

To publish a new version, **bump the version suffix in the filename** and update the URL
in the project config — e.g. `she_sim_temporal.pmtiles` → `she_sim_temporal_v2.pmtiles`,
then change `url:` in `frontend/src/config/projects/<id>.ts`. The new filename is a fresh
URL, so every client refetches it instantly. (This is the same scheme GHSL uses; GHSL
files additionally get `immutable` because their name always carries a version.)

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
