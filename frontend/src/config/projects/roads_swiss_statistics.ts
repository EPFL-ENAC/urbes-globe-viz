import type { ProjectConfig } from "./types";

const baseUrl = import.meta.env.DEV
  ? "/geodata"
  : "https://enacit4r-cdn-s3.epfl.ch/urbes-viz";

export const roadsSwissStatisticsProject: ProjectConfig = {
  id: "roads_swiss_statistics",
  coordinates: [6.58, 46.51], // Lausanne

  title: "Traffic",
  description: "Current traffic volume on Swiss roads",
  category: "Transport",
  year: 2017,
  preview: "traffic.png",
  zoom: 10,
  pitch: 0,

  unit: "vehicles/day",
  info: "Source: Swiss Federal Office for Spatial Development",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/roads_swiss_statistics.pmtiles`,
  },
  layer: {
    id: "roads_swiss_statistics-layer",
    type: "line",
    source: "roads_swiss_statistics",
    "source-layer": "roads_swiss_statistics",
    paint: {
      "line-color": [
        "interpolate",
        ["linear"],
        ["get", "DWV_PW"],
        0,
        "#b0e0e6",
        5000,
        "#4682b4",
        10000,
        "#ff4500",
        20000,
        "#8b0000",
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["get", "DTV_PW"],
        0,
        0.5,
        5000,
        2,
        10000,
        4,
        20000,
        6,
      ],
      "line-opacity": 0.8,
    },
  },
};
