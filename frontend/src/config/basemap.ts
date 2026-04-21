/**
 * Shared GHSL basemap configuration consumed by the `useGhslBasemap`
 * composable. The basemap always renders in its dark-palette form; the
 * light theme is produced by applying `filter: invert(1)` to the basemap
 * canvas container (see `style.css` and the `.ghsl-basemap-canvas` class).
 *
 * Layers (rendered bottom → top):
 * 1. Dark background
 * 2. GHSL built-surface raster (live PMTiles).
 * 3. OpenStreetMap buildings vector — appears at zoom 10+.
 */
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

// Always use the deployed URL — ghsl.pmtiles is too large (~14 GB) for local dev
const ghslUrl = "pmtiles://https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";

export const basemapSources: Record<string, SourceSpecification> = {
  "ghsl-urban": {
    type: "raster",
    url: ghslUrl,
    tileSize: 256,
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
    id: "ghsl-layer",
    type: "raster",
    source: "ghsl-urban",
    paint: {
      "raster-contrast": rasterContrast as unknown as number,
      "raster-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
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
