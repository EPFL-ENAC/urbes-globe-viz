import type { ExpressionSpecification } from "maplibre-gl";
import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

const heightSimValue: ExpressionSpecification = [
  "to-number",
  ["get", "height_sim"],
  0,
];

export const sheSimProject: ProjectConfig = {
  id: "she_sim",
  coordinates: [104.225, 35.875],

  title: "Simulated urban height dynamics in East Asia",
  description: `
This layer shows an example simulation of urban height dynamics across East Asia in 2020, initialized from 1993 conditions.

The simulation follows the modelling approach developed in the preprint [Dynamic roughening of cities driven by multiplicative noise](https://arxiv.org/abs/2510.02904) by Hendrick and Manoli. The approach represents urban height growth as a stochastic surface-growth process: local height changes evolve with multiplicative noise, while spatial coupling between neighbouring locations shapes the emerging urban morphology.

  `,

  category: "Climate",
  year: 2020,
  preview: "she_sim.png",

  zoom: 4,
  previewZoom: 4,
  pitch: 58,

  unit: "height_sim",
  info: "Simulated height, timestep 25",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/she_sim.pmtiles`,
  },

  layer: {
    id: "she_sim-layer",
    type: "fill-extrusion",
    source: "she_sim",
    "source-layer": "she_sim",
    minzoom: 3,

    paint: {
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        heightSimValue,
        0.5,
        12000,
        0.75,
        22000,
        1.0,
        35000,
        1.5,
        60000,
        3.0,
        110000,
        13.0,
        260000,
      ],

      "fill-extrusion-base": 0,

      "fill-extrusion-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        0.55,
        5,
        0.78,
        8,
        0.9,
      ],

      "fill-extrusion-vertical-gradient": true,

      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        heightSimValue,
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
};
