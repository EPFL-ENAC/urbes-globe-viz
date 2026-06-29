import type { ProjectConfig } from "./types";
import type { ProjectLegend, TimeControlConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

// Merged project: hourly population dynamics (fill-extrusion + hour slider)
// followed by DAVE mobility flows (deck.gl arcs). The top-level source/layer/
// timeControl drive ProjectMap (resolved via mapLayers by project id); the
// flows sections switch to the DaveFlowsMap renderer per sub-viz.

// Shared between the top-level config (consumed by ProjectMap through
// mapLayers) and the population sub-viz (consumed by the drawer UI).
const populationTimeControl: TimeControlConfig = {
  min: 0,
  max: 23,
  step: 1,
  initial: 12,
  fieldTemplate: "hour_{value}",
  placeholderField: "hour_12",
  label: "Hour",
  displayFormat: "hour",
  autoplayIntervalMs: 500,
};

const populationLegend: ProjectLegend = {
  title: "Hourly population",
  gradient: {
    stops: [
      { value: "0", color: "#00ffff" },
      { value: "500", color: "#0080FF" },
      { value: "1'000", color: "#4000FF" },
      { value: "2'000", color: "#8000FF" },
      { value: "3'000", color: "#C000FF" },
      { value: "4'000", color: "#FF00FF" },
      { value: "5'000", color: "#FF80FF" },
    ],
    unit: "adults/500m²",
  },
};

export const hourlyAdultPopulationProject: ProjectConfig = {
  id: "hourly_adult_population",
  coordinates: [6.58, 46.41], // Lausanne

  title: "Population dynamics\n& Mobility Flows",
  description: `
A census tells you where people live - but cities are actually alive. Mobility constantly reshapes population distribution. Exposure to heat and air pollution depends on where people actually are at different times. We use the _DAVE_ activity-based model to simulate how population shifts continuously across the city as people commute, work, shop, and spend leisure time.
`,
  category: "Demographics",
  year: 2024,
  cardImage: "hourly_adult_population.webp",
  zoom: 9,
  previewZoom: 7,
  pitch: 30,

  unit: "adults/500m²",
  info: "Source: DAVE Simulations, URBES",

  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/hourly_adult_population.pmtiles`,
  },
  layer: {
    id: "hourly_adult_population-layer",
    type: "fill-extrusion",
    source: "hourly_adult_population",
    "source-layer": "hourly_adult_population_wgs84",
    filter: [">=", ["get", "hour_12"], 5],
    paint: {
      "fill-extrusion-height": ["*", ["get", "hour_12"], 5],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.8,
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["get", "hour_12"],
        0,
        "#00ffff",
        500,
        "#0080FF",
        1000,
        "#4000FF",
        2000,
        "#8000FF",
        3000,
        "#C000FF",
        4000,
        "#FF00FF",
        5000,
        "#FF80FF",
      ],
    },
  },
  timeControl: populationTimeControl,

  subViz: [
    {
      id: "population",
      title: "Population dynamics",
      description:
        "A census tells you where people live - but cities are actually alive. Mobility constantly reshapes population distribution. Exposure to heat and air pollution depends on where people actually are at different times. We use the _DAVE_ activity-based model to simulate how population shifts continuously across the city as people commute, work, shop, and spend leisure time.",
      descriptionComponent: () =>
        import("./descriptions/hourly_adult_population.vue"),
      legend: populationLegend,
      timeControl: populationTimeControl,
    },
    {
      id: "flows",
      title: "Mobility Flows",
      description:
        "Where do people in Switzerland go - and why? Using an advanced simulation model _DAVE_, we mapped everyday movement across Vaud and Geneva, uncovering distinct patterns depending on the purpose of each trip.",
      renderer: "deckgl-arcs",
      dataUrl: "dave_flows_work.geojson",
    },
    {
      id: "work",
      title: "Work Flows",
      description:
        "The strongest flows on a weekday. People travel from residential areas toward major employment hubs, with Lausanne and Geneva drawing the largest volumes of commuters.",
      renderer: "deckgl-arcs",
      dataUrl: "dave_flows_work.geojson",
    },
    {
      id: "outdoor",
      title: "Outdoor Flows",
      description:
        "When people head outside for fresh air, they move in the opposite direction - away from city centers and toward parks, forests, and rural areas on the urban fringe. The abundance of green space in this region produces a wide, dispersed pattern rather than a few concentrated hotspots.",
      renderer: "deckgl-arcs",
      dataUrl: "dave_flows_outdoor.geojson",
    },
    {
      id: "indoor_leisure",
      title: "Indoor leisure Flows",
      description:
        "Cultural venues and sports facilities pull people into cities rather than away from them. Indoor leisure trips cluster strongly around urban cores, revealing a polycentric structure: Lausanne and Geneva dominate, but smaller hubs like Yverdon-les-Bains and Montreux play a clear role too.",
      renderer: "deckgl-arcs",
      dataUrl: "dave_flows_indoor_leisure.geojson",
    },
  ],
};
