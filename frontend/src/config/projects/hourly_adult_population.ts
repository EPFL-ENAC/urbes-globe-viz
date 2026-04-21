import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const hourlyAdultPopulationProject: ProjectConfig = {
  id: "hourly_adult_population",
  coordinates: [6.58, 46.41], // Lausanne

  title: "Hourly Population",
  description: "Dynamic population distribution by hour",
  category: "Demographics",
  year: 2020,
  preview: "hourly_population.png",
  zoom: 9,
  previewZoom: 7,
  pitch: 30,

  unit: "adults/500m²",
  info: "Source: DAVE Simulations, URBES",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/hourly_adult_population.pmtiles`,
  },
  layer: {
    id: "hourly_adult_population-layer",
    type: "fill-extrusion",
    source: "hourly_adult_population",
    "source-layer": "hourly_adult_population_wgs84",
    filter: [">=", ["get", "hour_12"], 5],
    paint: {
      "fill-extrusion-height": ["*", ["get", "hour_12"], 5],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.8,
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["get", "hour_12"],
        0,
        "#00ffff",
        500,
        "#0080FF",
        1000,
        "#4000FF",
        2000,
        "#8000FF",
        3000,
        "#C000FF",
        4000,
        "#FF00FF",
        5000,
        "#FF80FF",
      ],
    },
  },
  legend: {
    title: "Hourly population",
    gradient: {
      stops: [
        { value: "0", color: "#00ffff" },
        { value: "500", color: "#0080FF" },
        { value: "1'000", color: "#4000FF" },
        { value: "2'000", color: "#8000FF" },
        { value: "3'000", color: "#C000FF" },
        { value: "4'000", color: "#FF00FF" },
        { value: "5'000", color: "#FF80FF" },
      ],
      unit: "adults/500m²",
    },
  },
  timeControl: {
    min: 0,
    max: 23,
    step: 1,
    initial: 12,
    fieldTemplate: "hour_{value}",
    placeholderField: "hour_12",
    label: "Hour",
    displayFormat: "hour",
    autoplayIntervalMs: 500,
  },
};
