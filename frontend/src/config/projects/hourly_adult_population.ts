import type { ProjectConfig } from "./types";

const baseUrl = import.meta.env.DEV
  ? "/geodata"
  : "https://enacit4r-cdn-s3.epfl.ch/urbes-viz";

export const hourlyAdultPopulationProject: ProjectConfig = {
  id: "hourly_adult_population",
  coordinates: [6.58, 46.41], // Lausanne

  title: "Hourly Population",
  description: "Dynamic population distribution by hour",
  category: "Demographics",
  year: 2020,
  preview: "hourly_population.png",
  zoom: 9,
  pitch: 70,

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
};
