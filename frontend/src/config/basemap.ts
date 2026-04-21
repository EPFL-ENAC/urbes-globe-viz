/**
 * Shared GHSL basemap configuration consumed by the `useGhslBasemap`
 * composable. The basemap always renders in its dark-palette form; the
 * light theme is produced by applying `filter: invert(1)` to the basemap
 * canvas container (see `style.css` and the `.ghsl-basemap-canvas` class).
 *
 * Layers (rendered bottom → top):
 * 1. Dark background
 * 2. GHSL low-zoom raster — extracted sub-pyramid (z=0..STATIC_TILES_MAX_ZOOM)
 *    of the live pmtiles, served from /ghsl-low.pmtiles.
 * 3. GHSL built-surface raster (live PMTiles) — takes over at the handoff zoom.
 * 4. OpenStreetMap buildings vector — appears at zoom 10+.
 */
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

// Always use the deployed URL — ghsl.pmtiles is too large (~14 GB) for local dev
const ghslUrl = "pmtiles://https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";

// Local sub-pyramid bundled in public/. Regenerate with:
//   node scripts/generate-ghsl-preview.mjs <maxZoom>
// Bumping this requires updating PMTILES_HANDOFF_ZOOM below as well.
const STATIC_TILES_MAX_ZOOM = 4;

// Zoom at which the live PMTiles raster takes over from the static archive.
const PMTILES_HANDOFF_ZOOM = STATIC_TILES_MAX_ZOOM;

// Zoom at which we start letting MapLibre fetch live PMTiles in the
// background, while keeping ghsl-layer invisible (opacity 0). Combined with
// MapLibre's `prefetchZoomDelta` (default 4), this means tiles for the next
// few zoom levels are warmed up before the user actually reaches the handoff,
// so the preview→live transition is instant rather than a wait-for-network.
const PMTILES_PRELOAD_ZOOM = PMTILES_HANDOFF_ZOOM - 1;

export const basemapSources: Record<string, SourceSpecification> = {
  "ghsl-static": {
    type: "raster",
    url: "pmtiles:///ghsl-low.pmtiles",
    tileSize: 256,
    maxzoom: STATIC_TILES_MAX_ZOOM,
  },
  "ghsl-urban": {
    type: "raster",
    url: ghslUrl,
    tileSize: 256,
    minzoom: PMTILES_PRELOAD_ZOOM,
  },
  "osm-buildings": {
    type: "vector",
    url: "https://tiles.openfreemap.org/planet",
    minzoom: 10,
  },
};

const rasterContrast = [
  "interpolate",
  ["linear"],
  ["zoom"],
  2,
  0.9,
  6,
  0.7,
] as const;

export const basemapLayers: LayerSpecification[] = [
  {
    id: "background",
    type: "background",
    paint: { "background-color": "#111111" },
  },
  {
    // Local tile pyramid extracted from ghsl.pmtiles (see
    // scripts/generate-ghsl-preview.mjs). Visible at zoom 0..handoff−1.
    id: "ghsl-static-layer",
    type: "raster",
    source: "ghsl-static",
    maxzoom: PMTILES_HANDOFF_ZOOM,
    paint: {
      "raster-contrast": rasterContrast as unknown as number,
    },
  },
  {
    id: "ghsl-layer",
    type: "raster",
    source: "ghsl-urban",
    minzoom: PMTILES_HANDOFF_ZOOM,
    paint: {
      "raster-contrast": rasterContrast as unknown as number,
      "raster-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        PMTILES_HANDOFF_ZOOM - 0.01,
        0,
        PMTILES_HANDOFF_ZOOM,
        1,
        13,
        1,
        13.5,
        0.8,
        14,
        0.2,
      ],
    },
  },
  {
    id: "buildings",
    type: "fill",
    source: "osm-buildings",
    "source-layer": "building",
    minzoom: 10,
    paint: {
      "fill-color": "#FFFFFF",
      "fill-outline-color": [
        "interpolate-hcl",
        ["linear"],
        ["zoom"],
        14,
        "#FFFFFF",
        15,
        "#222222",
      ],
    },
  },
];
