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

const palmVariables: CogVariableConfig[] = [
  {
    id: "ta",
    label: "Temperature",
    cogRaster: {
      url: "palm_ta_cog.tif",
      colorScale: [
        "#30123b",
        "#4687fa",
        "#1ae4b6",
        "#a4fc3b",
        "#fabc29",
        "#e4460a",
        "#7a0403",
      ],
      colorScaleValueRange: [22, 34],
    },
    legend: {
      title: "Air Temperature",
      gradient: {
        stops: [
          { value: "34°C", color: "#7a0403" },
          { value: "32°C", color: "#e4460a" },
          { value: "30°C", color: "#fabc29" },
          { value: "28°C", color: "#a4fc3b" },
          { value: "26°C", color: "#1ae4b6" },
          { value: "24°C", color: "#4687fa" },
          { value: "22°C", color: "#30123b" },
        ],
        unit: "°C",
      },
    },
  },
  {
    id: "wspeed",
    label: "Wind Speed",
    cogRaster: {
      url: "palm_wspeed_cog.tif",
      colorScale: ["#440154", "#31688e", "#35b779", "#90d743", "#fde725"],
      colorScaleValueRange: [0, 1.5],
    },
    legend: {
      title: "Wind Speed",
      gradient: {
        stops: [
          { value: "1.5", color: "#fde725" },
          { value: "1.2", color: "#90d743" },
          { value: "0.8", color: "#35b779" },
          { value: "0.4", color: "#31688e" },
          { value: "0", color: "#440154" },
        ],
        unit: "m/s",
      },
    },
  },
  {
    id: "rh",
    label: "Humidity",
    cogRaster: {
      url: "palm_rh_cog.tif",
      colorScale: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
      colorScaleValueRange: [0, 16],
    },
    legend: {
      title: "Relative Humidity",
      gradient: {
        stops: [
          { value: "16%", color: "#08306b" },
          { value: "12%", color: "#2171b5" },
          { value: "8%", color: "#6baed6" },
          { value: "4%", color: "#c6dbef" },
          { value: "0%", color: "#f7fbff" },
        ],
        unit: "%",
      },
    },
  },
  {
    id: "theta",
    label: "Pot. Temperature",
    cogRaster: {
      url: "palm_theta_cog.tif",
      colorScale: [
        "#30123b",
        "#4687fa",
        "#1ae4b6",
        "#a4fc3b",
        "#fabc29",
        "#e4460a",
        "#7a0403",
      ],
      colorScaleValueRange: [296, 305],
    },
    legend: {
      title: "Potential Temperature",
      gradient: {
        stops: [
          { value: "305 K", color: "#7a0403" },
          { value: "303.5 K", color: "#e4460a" },
          { value: "302 K", color: "#fabc29" },
          { value: "300.5 K", color: "#a4fc3b" },
          { value: "299 K", color: "#1ae4b6" },
          { value: "297.5 K", color: "#4687fa" },
          { value: "296 K", color: "#30123b" },
        ],
        unit: "K",
      },
    },
  },
];

export const wrfProject: ProjectConfig = {
  id: "wrf",
  coordinates: [6.63, 46.52], // Lausanne area

  title: "Urban Climate",
  description:
    "Mesoscale (WRF) and microscale (PALM) climate simulations " +
    "over Swiss urban areas. Nested domains from 1 km to 0.5 m resolution.",
  category: "Climate",
  year: 2022,
  zoom: 9,
  pitch: 0,
  preview: "urban_climate.png",

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
      title: "WRF d02 — Leman Region",
      description:
        "Mesoscale WRF simulation at 1 km resolution covering " +
        "the full Leman Lake region.",
      coordinates: [6.555, 46.46],
      zoom: 9,
      renderer: "deckgl-cog",
      cogVariables: wrfVariables("d02"),
    },
    {
      id: "wrf-d03",
      title: "WRF d03 — Lausanne",
      description:
        "Mesoscale WRF simulation at 333 m resolution " +
        "over the Lausanne metropolitan area.",
      coordinates: [6.606, 46.543],
      zoom: 11,
      renderer: "deckgl-cog",
      cogVariables: wrfVariables("d03"),
    },
    {
      id: "wrf-d04",
      title: "WRF d04 — Geneva",
      description:
        "Mesoscale WRF simulation at 333 m resolution " +
        "over the Geneva metropolitan area.",
      coordinates: [6.149, 46.228],
      zoom: 11,
      renderer: "deckgl-cog",
      cogVariables: wrfVariables("d04"),
    },
    {
      id: "palm",
      title: "PALM — Lausanne Microscale",
      description:
        "PALM large-eddy simulation at 0.5 m resolution over a " +
        "50 m × 50 m urban domain in Lausanne. 93 timesteps at 10-minute intervals.",
      coordinates: [6.63005, 46.51605],
      zoom: 20,
      renderer: "deckgl-cog",
      cogVariables: palmVariables,
      timeControl: {
        min: 0,
        max: 92,
        step: 1,
        initial: 0,
        label: "Step",
        displayFormat: "number",
        autoplayIntervalMs: 200,
      },
    },
  ],
};
