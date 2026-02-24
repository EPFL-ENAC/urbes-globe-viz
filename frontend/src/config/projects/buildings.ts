import type { ProjectConfig } from "./types";

const baseUrl = import.meta.env.DEV
  ? "/geodata"
  : "https://enacit4r-cdn-s3.epfl.ch/urbes-viz";

export const buildingsProject: ProjectConfig = {
  id: "buildings",
  coordinates: [6.6327, 46.5397], // Geneva

  title: "Buildings",
  description: "Swiss building footprints with construction year data",
  category: "Infrastructure",
  year: 2023,
  preview: "buildings_height.png",
  zoom: 13,
  pitch: 75,

  unit: "year",
  info: "Source: Swiss Federal Office of Topography",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/buildings_swiss.pmtiles`,
    minzoom: 5,
  },
  layer: {
    id: "buildings-layer",
    type: "fill-extrusion",
    source: "buildings",
    "source-layer": "buildings_swiss",
    paint: {
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["to-number", ["get", "OBJORIG_YE"]],
        1950,
        10,
        2000,
        50,
        2020,
        100,
      ],
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["to-number", ["get", "OBJORIG_YE"]],
        1950,
        "#FF0000",
        2000,
        "#FFFF00",
        2020,
        "#00FF00",
      ],
      "fill-extrusion-base": [
        "case",
        [">=", ["get", "zoom"], 16],
        ["get", "render_min_height"],
        0,
      ],
    },
  },
};
