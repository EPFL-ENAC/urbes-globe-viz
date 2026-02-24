import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

export interface ProjectConfig {
  // Identity & geography
  id: string;
  coordinates: [number, number]; // [longitude, latitude]

  // Card metadata
  title: string;
  description: string;
  category: string;
  year: number;
  preview?: string;
  zoom?: number;
  pitch?: number;

  // Display labels (shown in UI)
  unit: string;
  info: string;

  // MapLibre source + layer spec — omit for projects using custom renderers (e.g. deck.gl)
  source?: SourceSpecification;
  layer?: LayerSpecification;

  // Custom renderer tag — consumed by ProjectDetailView to pick the right map component.
  // Leave undefined for standard MapLibre ProjectMap.
  // "deckgl-arcs" → DaveFlowsMap (ArcLayer with brushing)
  renderer?: string;
}
