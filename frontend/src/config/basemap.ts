/**
 * Shared GHSL basemap configuration consumed by the `useGhslBasemap`
 * composable. The basemap always renders in its dark-palette form; the
 * light theme is produced by applying `filter: invert(1)` to the basemap
 * canvas container (see `style.css` and the `.ghsl-basemap-canvas` class).
 *
 * App background is pure white (light) / pure black (dark).
 * Water is near-black (#050505) → inverts to very light grey #fafafa for light mode.
 * Land keeps the desaturated purple-grey.
 */
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { geodataBaseUrl } from "./geodata";

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
  "ne-land": {
    type: "vector",
    url: `pmtiles://${geodataBaseUrl}/ne_10m_land.pmtiles`,
  },
  "ne-graticules": {
    type: "vector",
    url: `pmtiles://${geodataBaseUrl}/ne_10m_graticules_20.pmtiles`,
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

/**
 * The globe's own surface colour. Light mode inverts the whole basemap canvas
 * (see style.css), so this near-black is what paints the near-white "paper"
 * globe there.
 */
export const basemapSurfaceColor = "#010101";

/**
 * Without an explicit sky, MapLibre floods the entire canvas with the
 * background layer, so the sphere and the space around it end up the same
 * colour and the globe has no visible edge — the dark theme's long-standing
 * "globe and background are the same black" problem. Painting the sky in the
 * surface colour keeps the canvas transparent outside the sphere, letting
 * `--color-map-bg` act as the ground the globe sits on (grey in light mode,
 * #1a1a1a in dark). `atmosphere-blend: 0` keeps the limb a crisp edge rather
 * than a glowing halo, in keeping with the flat paper look.
 */
export const basemapSky = {
  "sky-color": basemapSurfaceColor,
  "horizon-color": basemapSurfaceColor,
  "fog-color": basemapSurfaceColor,
  "sky-horizon-blend": 0,
  "horizon-fog-blend": 0,
  "fog-ground-blend": 0,
  "atmosphere-blend": 0,
} as const;

export const basemapLayers: LayerSpecification[] = [
  {
    id: "background",
    type: "background",
    paint: { "background-color": basemapSurfaceColor },
  },
  {
    id: "graticules",
    type: "line",
    source: "ne-graticules",
    "source-layer": "graticules",
    paint: {
      "line-color": "#8c8c8c",
      "line-width": 1,
      "line-opacity": 0.3,
    },
  },
  {
    id: "land-fill",
    type: "fill",
    source: "ne-land",
    "source-layer": "land",
    paint: {
      "fill-color": "#1c1822",
      "fill-outline-color": "transparent",
    },
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
