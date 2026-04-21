import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const buildingsProject: ProjectConfig = {
  id: "buildings",
  coordinates: [6.6327, 46.5397], // Geneva

  title: "Buildings",
  description: `
Swiss building footprints tagged with construction year, drawn from [SwissTLM3D](https://www.swisstopo.admin.ch/en/landscape-model-swisstlm3d). At _URBES_ the dataset stands in for the morphological and thermal character of the built fabric: stock from different eras retains heat differently and shapes how each neighbourhood experiences the urban heat island.

The height of each footprint encodes a representative floor count per construction period; the colour runs from red for pre-1950 stock through yellow for the post-war wave to green for contemporary buildings.
`,
  descriptionComponent: () => import("./descriptions/buildings.vue"),
  category: "Infrastructure",
  year: 2023,
  preview: "buildings_height.png",
  zoom: 13,
  pitch: 30,

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

  legend: {
    title: "Construction year",
    items: [
      { color: "#FF0000", label: "Pre-1950", shape: "square" },
      { color: "#FFFF00", label: "1950–2000", shape: "square" },
      { color: "#00FF00", label: "Post-2000", shape: "square" },
    ],
  },
};
