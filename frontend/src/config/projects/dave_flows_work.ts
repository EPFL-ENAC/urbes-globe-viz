import type { ProjectConfig } from "./types";

// No source/layer — this project is rendered by DaveFlowsMap using deck.gl ArcLayer.
// The GeoJSON is fetched directly at runtime from the CDN or local geodata directory.

export const daveFlowsWorkProject: ProjectConfig = {
  id: "dave_flows_work",
  coordinates: [6.5, 46.55], // Vaud-Geneva region

  title: "DAVE Flows",
  description:
    "Origin-destination mobility flows for the work environment at 10am, modelled by the DAVE activity-based simulation for the Vaud-Geneva region (500m grid).",
  category: "Mobility",
  year: 2024,
  preview: "dave_flows_work.png",
  zoom: 9,
  pitch: 0,

  unit: "persons",
  info: "Source: DAVE simulation model, EPFL",

  renderer: "deckgl-arcs",
  // source and layer intentionally absent — rendered by DaveFlowsMap
};
