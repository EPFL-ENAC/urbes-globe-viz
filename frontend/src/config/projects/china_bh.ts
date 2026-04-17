import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const china_bh: ProjectConfig = {
  id: "china_bh",
  coordinates: [120.5, 30.5], // Zhejiang/Jiangsu region, China

  title: "Building China",
  description: "Observed and simulated building heights across Chinese cities",
  category: "Infrastructure",
  year: 1995,
  preview: "china_bh_prev.png",
  zoom: 6,
  pitch: 60,

  unit: "meters",
  info: "Source: URBES Research",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/china_bh.pmtiles`,
  },
  layer: {
    id: "china_bh",
    type: "circle",
    source: "china_bh",
    "source-layer": "my_data",
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
  legend: {
    title: "Building height",
    items: [
      { color: "#ffffcc", label: "0-2m", shape: "square" },
      { color: "#ffeda0", label: "2-3m", shape: "square" },
      { color: "#fed976", label: "3-4m", shape: "square" },
      { color: "#feb24c", label: "4-5m", shape: "square" },
      { color: "#fd8d3c", label: "5-6m", shape: "square" },
      { color: "#fc4e2a", label: "6-8m", shape: "square" },
      { color: "#e31a1c", label: "8-10m", shape: "square" },
      { color: "#bd0026", label: "10-12m", shape: "square" },
      { color: "#800026", label: "12m+", shape: "square" },
    ],
  },
};
