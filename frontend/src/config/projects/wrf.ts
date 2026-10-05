import type { CogVariableConfig, ProjectConfig } from "./types";

// Shared variable definitions — same color scales across all WRF domains
const wrfVariables = (domain: string): CogVariableConfig[] => [
  {
    id: "t2",
    label: "Temperature",
    cogRaster: {
      url: `wrf_${domain}_t2_cog.tif`,
      colorScale: [
        "#30123b",
        "#4687fa",
        "#1ae4b6",
        "#a4fc3b",
        "#fabc29",
        "#e4460a",
        "#7a0403",
      ],
      colorScaleValueRange: [278, 310],
    },
    legend: {
      title: "2m Temperature",
      gradient: {
        stops: [
          { value: "37 °C", color: "#7a0403" },
          { value: "31 °C", color: "#e4460a" },
          { value: "26 °C", color: "#fabc29" },
          { value: "21 °C", color: "#a4fc3b" },
          { value: "16 °C", color: "#1ae4b6" },
          { value: "10 °C", color: "#4687fa" },
          { value: "5 °C", color: "#30123b" },
        ],
        unit: "°C",
      },
    },
  },
  {
    id: "u10",
    label: "Wind (U)",
    cogRaster: {
      url: `wrf_${domain}_u10_cog.tif`,
      colorScale: ["#313695", "#74add1", "#ffffbf", "#f46d43", "#a50026"],
      colorScaleValueRange: [-6, 6],
    },
    legend: {
      title: "10m Wind (U)",
      gradient: {
        stops: [
          { value: "6", color: "#a50026" },
          { value: "3", color: "#f46d43" },
          { value: "0", color: "#ffffbf" },
          { value: "-3", color: "#74add1" },
          { value: "-6", color: "#313695" },
        ],
        unit: "m/s",
      },
    },
  },
  {
    id: "q2",
    label: "Humidity",
    cogRaster: {
      url: `wrf_${domain}_q2_cog.tif`,
      colorScale: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
      colorScaleValueRange: [0.003, 0.013],
    },
    legend: {
      title: "2m Humidity",
      gradient: {
        stops: [
          { value: "13", color: "#08306b" },
          { value: "10.5", color: "#2171b5" },
          { value: "8", color: "#6baed6" },
          { value: "5.5", color: "#c6dbef" },
          { value: "3", color: "#f7fbff" },
        ],
        unit: "g/kg",
      },
    },
  },
  {
    id: "swdown",
    label: "Radiation",
    cogRaster: {
      url: `wrf_${domain}_swdown_cog.tif`,
      colorScale: ["#ffffcc", "#fed976", "#fd8d3c", "#e31a1c", "#800026"],
      colorScaleValueRange: [930, 1060],
    },
    legend: {
      title: "Solar Radiation",
      gradient: {
        stops: [
          { value: "1060", color: "#800026" },
          { value: "1020", color: "#e31a1c" },
          { value: "990", color: "#fd8d3c" },
          { value: "960", color: "#fed976" },
          { value: "930", color: "#ffffcc" },
        ],
        unit: "W/m²",
      },
    },
  },
];

export const wrfProject: ProjectConfig = {
  id: "wrf",
  coordinates: [6.63, 46.52], // Lausanne area

  title: "Lake-City Climates",
  description: `
One-way nested numerical weather simulations over Swiss urban areas, cascading from mesoscale [WRF](https://www.mmm.ucar.edu/models/wrf) at 1 km down to microscale [PALM](https://palm.muk.uni-hannover.de/) at 0.5 m. The chain is a central tool in _URBES'_ work on urban climate in complex terrain, ranging from [regional circulation patterns](https://royalsocietypublishing.org/rsta/article-abstract/383/2308/20240576/234202/Urbanization-effects-on-lake-land-circulations-in?redirectedFrom=fulltext) to [wind energy](https://onlinelibrary.wiley.com/doi/10.1002/we.70043) harvesting potential, to microscale heat adaptation strategies.
`,
  category: "Climate",
  year: "2022 & 2025",
  zoom: 9,
  // Landing-page capture sits further out than the interactive view so the
  // preview reads as a vignette next to the hero text.
  previewZoom: 7,
  pitch: 0,
  cardImage: "wrf.webp",

  unit: "K",
  info: "Source: Aldo Brandi, URBES",

  renderer: "deckgl-cog",

  // Default for globe preview card
  cogRaster: {
    url: "wrf_d03_t2_cog.tif",
    colorScale: [
      "#30123b",
      "#4687fa",
      "#1ae4b6",
      "#a4fc3b",
      "#fabc29",
      "#e4460a",
      "#7a0403",
    ],
    colorScaleValueRange: [278, 310],
  },

  subViz: [
    {
      id: "wrf-d02",
      title: "WRF d02 - Lake Geneva Region",
      // Fallback text if the component fails to load; also what appears in any
      // consumer that renders plain-text descriptions (e.g. globe tooltip).
      description:
        "Regional mesoscale WRF simulation output at 1 km over the Leman basin, resolving lake breezes, valley circulations, and the combined urban footprint of Lausanne and Geneva.",
      // Component override: renders the nested-domains schema + prose.
      descriptionComponent: () => import("./descriptions/wrf_d02.vue"),
      coordinates: [6.555, 46.46],
      zoom: 9,
      renderer: "deckgl-cog",
      cogVariables: wrfVariables("d02"),
    },
    {
      id: "wrf-d03",
      title: "WRF d03 - Lausanne",
      description:
        "WRF simulation output at 333 m over the Lausanne metropolitan area. The finer grid separates individual neighbourhoods from their surrounding countryside, giving the spatial detail needed to relate near-surface temperatures to urban form.",
      // SVG-based description: shows that `descriptionComponent` isn't
      // ECharts-specific, any Vue template works.
      descriptionComponent: () => import("./descriptions/wrf_d03.vue"),
      coordinates: [6.606, 46.543],
      zoom: 11,
      renderer: "deckgl-cog",
      cogVariables: wrfVariables("d03"),
    },
    {
      id: "wrf-d04",
      title: "WRF d04 - Geneva",
      description:
        "WRF simulation output at 333 m over the Geneva metropolitan area. Running Geneva and Lausanne back to back lets _URBES_ compare two lake-side agglomerations with distinct densities, green-space distributions, and industrial layouts.",
      // Reuses the same schema as d03, with the highlight moved to d04.
      descriptionComponent: () => import("./descriptions/wrf_d04.vue"),
      coordinates: [6.149, 46.228],
      zoom: 11,
      renderer: "deckgl-cog",
      cogVariables: wrfVariables("d04"),
    },
  ],
};
