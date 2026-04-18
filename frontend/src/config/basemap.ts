/**
 * Shared basemap configuration used by Globe3D, ProjectMap, and DaveFlowsMap.
 *
 * Layers (rendered bottom → top):
 * 1. Dark background
 * 2. GHSL low-zoom raster — extracted sub-pyramid (z=0..STATIC_TILES_MAX_ZOOM)
 *    of the live pmtiles, served from /ghsl-low.pmtiles. Same paint as the
 *    live layer → identical pixel output, so the handoff is invisible.
 * 3. GHSL built-surface raster (live PMTiles) — takes over at the handoff zoom.
 * 4. OpenStreetMap buildings vector — appears at zoom 10+
 */
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

// Always use the deployed URL — ghsl.pmtiles is too large (~14 GB) for local dev
const ghslUrl = "pmtiles://https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";

// Local sub-pyramid bundled in public/. Regenerate with:
//   node scripts/generate-ghsl-preview.mjs <maxZoom>
// Bumping this requires updating PMTILES_HANDOFF_ZOOM below as well.
const STATIC_TILES_MAX_ZOOM = 4;

// Zoom at which the live PMTiles raster takes over from the static archive.
// Below this we serve byte ranges from /ghsl-low.pmtiles (same-origin, fast);
// at and above this MapLibre fetches from urbes-viz.epfl.ch. Same shader on
// both sides → seamless.
const PMTILES_HANDOFF_ZOOM = STATIC_TILES_MAX_ZOOM + 1;

// Zoom at which we start letting MapLibre fetch live PMTiles in the
// background, while keeping ghsl-layer invisible (opacity 0). Combined with
// MapLibre's `prefetchZoomDelta` (default 4), this means tiles for the next
// few zoom levels are warmed up before the user actually reaches the handoff,
// so the preview→live transition is instant rather than a wait-for-network.
const PMTILES_PRELOAD_ZOOM = PMTILES_HANDOFF_ZOOM - 2;

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
    // Start at the preload zoom (not the handoff) so MapLibre can fetch
    // tiles in the background while ghsl-layer is still invisible.
    minzoom: PMTILES_PRELOAD_ZOOM,
  },
  "osm-buildings": {
    type: "vector",
    url: "https://tiles.openfreemap.org/planet",
    minzoom: 10,
  },
};

export const basemapLayers: LayerSpecification[] = [
  {
    id: "background",
    type: "background",
    paint: {
      "background-color": "#111111",
    },
  },
  {
    // Local tile pyramid extracted from ghsl.pmtiles (see
    // scripts/generate-ghsl-preview.mjs). Visible at zoom 0..handoff−1.
    // Same paint as ghsl-layer below so MapLibre's shader produces an
    // identical result to the live raster — no contrast tuning, no bake.
    id: "ghsl-static-layer",
    type: "raster",
    source: "ghsl-static",
    maxzoom: PMTILES_HANDOFF_ZOOM,
    paint: {
      // Match ghsl-layer's contrast exactly so the handoff is invisible.
      "raster-contrast": ["interpolate", ["linear"], ["zoom"], 2, 0.9, 6, 0.7],
    },
  },
  {
    id: "ghsl-layer",
    type: "raster",
    source: "ghsl-urban",
    // Layer is in range from the preload zoom so MapLibre treats it as active
    // and fetches its tiles. raster-opacity below keeps it invisible until
    // the actual handoff, by which point the tiles are already cached.
    minzoom: PMTILES_PRELOAD_ZOOM,
    paint: {
      "raster-contrast": ["interpolate", ["linear"], ["zoom"], 2, 0.9, 6, 0.7],
      "raster-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        // Invisible during preload so the static layer owns the viewport.
        PMTILES_HANDOFF_ZOOM - 0.01,
        0,
        // Hard switch to fully visible at the handoff zoom — tiles should
        // already be in cache thanks to the preload window above.
        PMTILES_HANDOFF_ZOOM,
        1,
        // Existing fade-out as buildings layer takes over at high zoom.
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
