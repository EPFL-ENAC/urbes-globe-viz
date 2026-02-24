import type { ProjectConfig } from "./types";

const baseUrl = import.meta.env.DEV
  ? "/geodata"
  : "https://enacit4r-cdn-s3.epfl.ch/urbes-viz";

export const buildingHeightsChinaProject: ProjectConfig = {
  id: "building_heights_china",
  coordinates: [120.5, 30.5], // Zhejiang/Jiangsu region, China

  title: "Building China",
  description: "Observed and simulated building heights across Chinese cities",
  category: "Infrastructure",
  year: 1995,
  preview: "building_heights_china.png",
  zoom: 6,
  pitch: 60,

  unit: "meters",
  info: "Source: URBES Research",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/building_heights_china.pmtiles`,
  },
  layer: {
    id: "building_heights_china-layer",
    type: "circle",
    source: "building_heights_china",
    "source-layer": "building_heights_china",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        2,
        8,
        8,
        12,
        16,
      ],
      "circle-opacity": 0.8,
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "height_fit"],
        0,
        "#ffffcc",
        2.0,
        "#ffeda0",
        3.0,
        "#fed976",
        4.0,
        "#feb24c",
        5.0,
        "#fd8d3c",
        6.0,
        "#fc4e2a",
        8.0,
        "#e31a1c",
        10.0,
        "#bd0026",
        12.0,
        "#800026",
      ],
      "circle-stroke-width": 0,
    },
  },
};
