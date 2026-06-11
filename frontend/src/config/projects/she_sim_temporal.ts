import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const sheSimTemporalProject: ProjectConfig = {
  id: "she_sim_temporal",
  coordinates: [104.225, 35.875],

  title: "Simulated urban height\ndynamics in East Asia",
  description: `
This layer shows a temporal simulation of urban height dynamics across East Asia, initialized from 1993 conditions.

The simulation follows the modelling approach developed in the preprint [Dynamic roughening of cities driven by multiplicative noise](https://arxiv.org/abs/2510.02904) by Hendrick and Manoli. The approach represents urban height growth as a stochastic surface-growth process: local height changes evolve with multiplicative noise, while spatial coupling between neighbouring locations shapes the emerging urban morphology.

Use the year slider to explore the simulated evolution through time. Both bar height and colour are proportional to the simulated height field.
  `,

  category: "Climate",
  year: 2020,
  preview: "she_sim_temporal.png",

  zoom: 4,
  previewZoom: 4,
  pitch: 58,

  unit: "height [m]",
  info: "Simulated height dynamics, 1993–2020",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/she_sim_temporal.pmtiles`,
  },

  layer: {
    id: "she_sim_temporal-layer",
    type: "fill-extrusion",
    source: "she_sim_temporal",
    "source-layer": "she_sim_temporal",
    minzoom: 4,
    filter: [">=", ["to-number", ["get", "height_2020"], 0], 1],

    paint: {
      "fill-extrusion-height": [
        "*",
        ["to-number", ["get", "height_2020"], 0],
        25000,
      ],

      "fill-extrusion-base": 0,

      "fill-extrusion-opacity": 0.85,

      "fill-extrusion-vertical-gradient": true,

      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["to-number", ["get", "height_2020"], 0],
        0.0,
        "#1f2d86",
        0.5,
        "#2c7bb6",
        0.75,
        "#00a6ca",
        1.0,
        "#00ccbc",
        1.5,
        "#90eb9d",
        3.0,
        "#f9d057",
        6.0,
        "#f29e2e",
        13.0,
        "#d7191c",
      ],
    },
  },

  legend: {
    title: "Simulated height",
    gradient: {
      stops: [
        { value: "0.5", color: "#2c7bb6" },
        { value: "0.75", color: "#00a6ca" },
        { value: "1.0", color: "#00ccbc" },
        { value: "1.5", color: "#90eb9d" },
        { value: "3.0", color: "#f9d057" },
        { value: "6.0", color: "#f29e2e" },
        { value: "13.0", color: "#d7191c" },
      ],
      unit: "height [m]",
    },
  },

  timeControl: {
    min: 1993,
    max: 2020,
    step: 1,
    initial: 2020,
    fieldTemplate: "height_{value}",
    placeholderField: "height_2020",
    label: "Year",
    displayFormat: "number",
    autoplayIntervalMs: 700,
  },
};
