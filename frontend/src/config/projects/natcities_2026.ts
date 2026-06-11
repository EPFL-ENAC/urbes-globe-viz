import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const NatCities2026Project: ProjectConfig = {
  id: "natcities_2026",
  coordinates: [10, 25],

  title: "Scaling climate\nfluctuations\nNat. Cities",
  description: `
**Urban climate does not vary randomly across cities.**  
Across 142 cities worldwide, intra-urban temperature and air-pollution fields follow general statistical patterns once rescaled by simple measures of urban form.

This project maps the study cities used to investigate the spatial structure of **urban heat**, **air quality**, **population**, and **street networks** through a scaling framework inspired by statistical physics.

Rather than describing cities only through average values or administrative boundaries, the analysis focuses on the full intra-urban variability of climate fields. The results show that average street-network properties can characterize much of the observed variability in temperature and pollution within and across cities.

**Reference**  
Duran-Sala, M., Hendrick, M. & Manoli, G.  
[Scaling intra-urban climate fluctuations](https://www.nature.com/articles/s44284-026-00441-z).  
*Nature Cities* (2026).
`,

  category: "Climate",
  year: 2026,
  preview: "natcities_2026.png",

  zoom: 1,
  previewZoom: 0.9,
  pitch: 0,

  unit: "study cities",
  info: "Study cities from Duran-Sala, Hendrick & Manoli, Nature Cities (2026)",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/natcities_2026_cities.pmtiles`,
  },

  layer: {
    id: "natcities_2026_cities-layer",
    type: "symbol",
    source: "natcities_2026",
    "source-layer": "natcities_2026_cities",
    minzoom: 0,

    layout: {
      "text-field": [
        "concat",
        "📍 ",
        ["coalesce", ["get", "city"], ["get", "City"], "City"],
      ],

      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        18,
        1,
        21,
        3,
        26,
        5,
        32,
      ],

      "text-anchor": "center",
      "text-offset": [0, 0],
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],

      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-optional": false,
    },

    paint: {
      "text-color": "#f9d057",
      "text-halo-color": "#111111",
      "text-halo-width": 2.2,
      "text-halo-blur": 0.7,

      "text-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.9, 2, 1],
    },
  },
};
