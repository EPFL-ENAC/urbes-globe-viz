import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const roadsSwissStatisticsProject: ProjectConfig = {
  id: "roads_swiss_statistics",
  coordinates: [6.58, 46.51], // Lausanne

  title: "Traffic",
  // HTML example. Raw HTML is valid markdown, so authoring the description as
  // HTML gives full control over elements, classes, and attributes.
  description: `
<p>
  Average daily traffic counts on Swiss roads, published by the Swiss
  Federal Office for Spatial Development
  (<a href="https://www.are.admin.ch/" target="_blank" rel="noopener">ARE</a>).
</p>
<p>
  At <em>URBES</em> the layer closes the loop between urban form and
  environmental exposure: high-traffic arteries heat the air around them,
  worsen night-time cooling, and carry most of the pollution residents
  actually breathe.
</p>
<p>
  Line width encodes the <em>daily</em> average volume and colour encodes
  the <em>weekday</em> average. Segments follow jurisdictional boundaries.
</p>
`,
  category: "Transport",
  year: 2017,
  preview: "traffic.png",
  zoom: 10,
  pitch: 0,

  unit: "vehicles/day",
  info: "Source: Swiss Federal Office for Spatial Development",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/roads_swiss_statistics.pmtiles`,
  },
  layer: {
    id: "roads_swiss_statistics-layer",
    type: "line",
    source: "roads_swiss_statistics",
    "source-layer": "roads_swiss_statistics",
    paint: {
      "line-color": [
        "interpolate",
        ["linear"],
        ["get", "DWV_PW"],
        0,
        "#b0e0e6",
        5000,
        "#4682b4",
        10000,
        "#ff4500",
        20000,
        "#8b0000",
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["get", "DTV_PW"],
        0,
        0.5,
        5000,
        2,
        10000,
        4,
        20000,
        6,
      ],
      "line-opacity": 0.8,
    },
  },

  legend: {
    title: "Traffic volume",
    items: [
      { color: "#b0e0e6", label: "0-5 000", shape: "line" },
      { color: "#4682b4", label: "5 000-10 000", shape: "line" },
      { color: "#ff4500", label: "10 000-20 000", shape: "line" },
      { color: "#8b0000", label: "20 000+", shape: "line" },
    ],
  },
};
