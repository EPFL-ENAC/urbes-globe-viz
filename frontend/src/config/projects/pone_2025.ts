import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const POne_2025Project: ProjectConfig = {
  id: "pone_2025",
  coordinates: [10, 52],

  title: "Mobility &\ntemperature exposure\nPLOS ONE",
  description: `
**Human mobility reshapes urban temperature exposure.**  
Extreme heat and cold risks are usually estimated from where people live, but daily commuting and seasonal travel can substantially change where people are actually exposed to hazardous temperatures.

This project shows the European study region used to combine **1-km daytime and nighttime population estimates** with high-resolution urban climate simulations for **80 European cities**.

The results show that commuting toward city centres increases summer heat exposure on daily timescales, while seasonal population changes often reduce heat exposure in most European cities, except in touristic destinations where warm-season exposure can increase.

**Reference**  
Lin, G.-S., Llaguno-Munitxa, M. & Manoli, G.  
[Daily and seasonal human mobility modulates temperature exposure in European cities](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0330912).  
*PLOS ONE* **20**(9): e0330912 (2025).
`,

  category: "Climate",
  year: 2025,
  preview: "pone_2025.PNG",

  zoom: 3.2,
  previewZoom: 3,
  pitch: 0,

  unit: "study region",
  info: "European study region for mobility and temperature exposure analysis",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/pone_2025_europe.pmtiles`,
  },

  layer: {
    id: "pone_2025_europe-layer",
    type: "line",
    source: "pone_2025",
    "source-layer": "pone_2025_europe",
    minzoom: 0,

    paint: {
      "line-color": "#f9d057",

      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        1.5,
        2,
        2.5,
        4,
        4,
        6,
        6,
      ],

      "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.75, 3, 0.95],

      "line-blur": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 4, 0.15],
    },
  },
};
