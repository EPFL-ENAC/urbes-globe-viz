/**
 * Shared basemap configuration used by Globe3D, ProjectMap, and DaveFlowsMap.
 *
 * Layers:
 * 1. Dark background
 * 2. GHSL built-surface raster (PMTiles) — fades out at high zoom
 * 3. OpenStreetMap buildings vector — appears at zoom 10+
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

export const basemapLayers: LayerSpecification[] = [
  {
    id: "background",
    type: "background",
    paint: {
      "background-color": "#111111",
    },
  },
  {
    id: "ghsl-layer",
    type: "raster",
    source: "ghsl-urban",
    paint: {
      "raster-contrast": ["interpolate", ["linear"], ["zoom"], 2, 0.9, 6, 0.7],
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
