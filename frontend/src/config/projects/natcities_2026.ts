import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const NatCities2026Project: ProjectConfig = {
  id: "...",
  coordinates: [104.225, 35.875],

  title: "Scaling climate fluctuations\nNat. Cities.",
  description: `
Urban-induced microclimate variations, such as urban heat islands and air pollution, scale with city
size, producing distinctive relations between average climate variables and city-scale quantities (e.g., total
population). However, these relations are sensitive to city boundary definitions and overlook intra-urban
variability. Here, we overcome these limitations by using high-resolution data of urban temperatures, air
quality, population, and street networks from 142 cities worldwide, showing that their marginal and joint
probability distributions collapse onto a set of general functions inspired by finite-size scaling in statistical
physics. Through a logarithmic relation linking urban spatial features to climate variables, we find that
average street network properties are sufficient to characterize the full variability of temperature and air
pollution fields within and across cities. These findings show that intra-urban climate variability follows
general scaling functions, enabling the integration of climate information into reduced-complexity models of
urban systems to better inform future urban planning. [Scaling intra-urban climate fluctuations](https://arxiv.org/pdf/2505.19998) 
  `,

  category: "Climate",
  year: 2026,
  preview: "natcities_2026.png",

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
