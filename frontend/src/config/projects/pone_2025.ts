import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const POne_2025Project: ProjectConfig = {
  id: "TOFILL",
  coordinates: [4.3572, 50.8476],

  title: "Mobility & temperature\n exposure, PLoS One",
  description: `
**Human mobility reshapes urban temperature exposure.**
Extreme heat and cold risks are usually estimated from where people live, but daily commuting and seasonal travel can substantially change where people are actually exposed to hazardous temperatures.

This project combines **1-km daytime and nighttime population estimates** with high-resolution urban climate simulations for **80 European cities** to assess how mobility modulates exposure to heat and cold.

The results show that commuting toward city centres increases summer heat exposure on daily timescales, while seasonal population changes often reduce heat exposure in most European cities, except in touristic destinations where warm-season exposure can increase.

**Reference**
Lin, G.-S., Llaguno-Munitxa, M. & Manoli, G.
[Daily and seasonal human mobility modulates temperature exposure in European cities](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0330912).
*PLOS ONE* **20**(9): e0330912 (2025).
`,

  category: "Climate",
  year: 2025,
  preview: "pone_2025.PNG",
  zoom: 4,
  previewZoom: 4,
  pitch: 58,

  unit: "height [m]",
  info: "Simulated height dynamics, 1993–2020",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/TOFILL`,
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
