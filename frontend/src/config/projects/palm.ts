import type { ProjectConfig } from "./types";

export const palmProject: ProjectConfig = {
  id: "palm",
  coordinates: [6.63005, 46.51605], // PALM origin (Lausanne)

  title: "Microscale Urban Climate",
  description:
    "PALM large-eddy simulation at 0.5 m resolution over a 50 m × 50 m " +
    "urban domain in Lausanne. 93 timesteps at 10-minute intervals " +
    "covering 15.5 hours of a summer day.",
  category: "Climate",
  year: 2025,
  zoom: 20,
  pitch: 0,

  unit: "°C",
  info: "Source: Aldo Brandi, URBES",

  renderer: "deckgl-cog",

  // Default for globe preview card
  cogRaster: {
    url: "palm_ta_cog.tif",
    colorScale: [
      "#000004",
      "#420a68",
      "#932667",
      "#dd513a",
      "#fca50a",
      "#fcffa4",
    ],
    colorScaleValueRange: [22, 34],
  },

  subViz: [
    {
      id: "temperature",
      title: "Air Temperature",
      description:
        "Air temperature at 1.25 m height (pedestrian level). " +
        "Shows the urban heat island effect and thermal comfort conditions " +
        "across the simulation domain.",
      renderer: "deckgl-cog",
      cogRaster: {
        url: "palm_ta_cog.tif",
        colorScale: [
          "#000004",
          "#420a68",
          "#932667",
          "#dd513a",
          "#fca50a",
          "#fcffa4",
        ],
        colorScaleValueRange: [22, 34],
      },
      legend: {
        title: "Air Temperature",
        gradient: {
          stops: [
            { value: "22°C", color: "#000004" },
            { value: "25°C", color: "#420a68" },
            { value: "28°C", color: "#932667" },
            { value: "31°C", color: "#dd513a" },
            { value: "34°C", color: "#fcffa4" },
          ],
          unit: "°C",
        },
      },
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
    {
      id: "wind",
      title: "Wind Speed",
      description:
        "Wind speed magnitude at 1.25 m height. " +
        "Low values indicate calm areas sheltered by buildings or vegetation, " +
        "while higher values show wind channeling through streets.",
      renderer: "deckgl-cog",
      cogRaster: {
        url: "palm_wspeed_cog.tif",
        colorScale: ["#440154", "#31688e", "#35b779", "#90d743", "#fde725"],
        colorScaleValueRange: [0, 1.5],
      },
      legend: {
        title: "Wind Speed",
        gradient: {
          stops: [
            { value: "0", color: "#440154" },
            { value: "0.4", color: "#31688e" },
            { value: "0.8", color: "#35b779" },
            { value: "1.2", color: "#90d743" },
            { value: "1.5", color: "#fde725" },
          ],
          unit: "m/s",
        },
      },
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
    {
      id: "humidity",
      title: "Relative Humidity",
      description:
        "Relative humidity at 1.25 m height. " +
        "Captures moisture patterns influenced by vegetation transpiration " +
        "and surface evaporation in the urban canopy.",
      renderer: "deckgl-cog",
      cogRaster: {
        url: "palm_rh_cog.tif",
        colorScale: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
        colorScaleValueRange: [0, 16],
      },
      legend: {
        title: "Relative Humidity",
        gradient: {
          stops: [
            { value: "0%", color: "#f7fbff" },
            { value: "4%", color: "#c6dbef" },
            { value: "8%", color: "#6baed6" },
            { value: "12%", color: "#2171b5" },
            { value: "16%", color: "#08306b" },
          ],
          unit: "%",
        },
      },
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
    {
      id: "theta",
      title: "Potential Temperature",
      description:
        "Potential temperature at 1.25 m height. " +
        "A thermodynamic quantity that removes the effect of pressure " +
        "differences, useful for comparing air masses.",
      renderer: "deckgl-cog",
      cogRaster: {
        url: "palm_theta_cog.tif",
        colorScale: ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"],
        colorScaleValueRange: [296, 305],
      },
      legend: {
        title: "Potential Temperature",
        gradient: {
          stops: [
            { value: "296 K", color: "#000004" },
            { value: "298 K", color: "#51127c" },
            { value: "300 K", color: "#b73779" },
            { value: "303 K", color: "#fc8961" },
            { value: "305 K", color: "#fcfdbf" },
          ],
          unit: "K",
        },
      },
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
