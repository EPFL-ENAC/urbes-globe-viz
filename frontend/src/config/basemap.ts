/**
 * Shared GHSL basemap configuration consumed by the `useGhslBasemap`
 * composable. The basemap always renders in its dark-palette form; the
 * light theme is produced by applying `filter: invert(1)` to the basemap
 * canvas container (see `style.css` and the `.ghsl-basemap-canvas` class).
 *
 * App background is pure white (light) / pure black (dark). Neither coastlines
 * nor graticules are drawn: the GHSL settlement raster is the only thing that
 * describes the sphere, so continents read purely as where people live. The
 * canvas is then duotoned to the violet accent in style.css.
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
