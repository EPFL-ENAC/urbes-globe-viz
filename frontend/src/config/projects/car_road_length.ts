import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";
export const lenOtherCarRoadsProject: ProjectConfig = {
  id: "len_other_car_roads",
  coordinates: [6.58, 46.41], // Lausanne

  title: "Car road length",
  // Markdown example. Italics, links, and lists all work; inline HTML is
  // passed through for edge cases.
  description: `
Aggregated car-accessible road length processed from [SwissTLM3D](https://www.swisstopo.admin.ch/en/landscape-model-swisstlm3d) and rasterised onto a 500 m² grid. Feeds _DAVE_ at [URBES](https://www.epfl.ch/labs/urbes/) as a capacity prior for private-car trips; autoroutes are excluded since they are counted separately in the national traffic statistics.

Colour encodes how much driveable road sits in each tile:

- light tones for quiet residential streets (0 to 4 000 m / 500 m²)
- orange for mixed arterials (4 000 to 12 000)
- dark red for dense urban cores (12 000+)
`,
  category: "Transport",
  year: 2025,
  preview: "car_road_length.png",
  zoom: 9,
  previewZoom: 7,
  pitch: 30,

  unit: "meters/500m²",
  info: "Source: SwissTLM3D, STATPOP",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/len_other_car_roads.pmtiles`,
  },
  layer: {
    id: "len_other_car_roads-layer",
    type: "fill-extrusion",
    source: "len_other_car_roads",
    "source-layer": "other_car_roads",
    paint: {
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["get", "sum"],
        0,
        0,
        18000,
        30000,
      ],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.8,
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["get", "sum"],
        0,
        "#ffffcc",
        2000,
        "#ffeda0",
        4000,
        "#fed976",
        8000,
        "#feb24c",
        12000,
        "#fd8d3c",
        16000,
        "#f03b20",
        20000,
        "#bd0026",
      ],
    },
  },
  legend: {
    title: "Car road length (except autoway)",
    gradient: {
      stops: [
        { value: "0", color: "#ffffcc" },
        { value: "2'000", color: "#ffeda0" },
        { value: "4'000", color: "#fed976" },
        { value: "8'000", color: "#feb24c" },
        { value: "12'000", color: "#fd8d3c" },
        { value: "16'000", color: "#f03b20" },
        { value: "20'000", color: "#bd0026" },
      ],
      unit: "meters/500m²",
    },
  },
};
