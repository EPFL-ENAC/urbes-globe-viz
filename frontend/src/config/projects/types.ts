import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

export interface LegendItem {
  color: string;
  label: string;
  shape?: "line" | "circle" | "square";
}

export interface LegendGradient {
  stops: Array<{ value: string | number; color: string }>;
  unit?: string;
}

export interface ProjectLegend {
  title?: string;
  items?: LegendItem[];
  gradient?: LegendGradient;
}

export interface TimeControlConfig {
  min: number;
  max: number;
  step?: number;
  initial: number;
  fieldTemplate: string;
  placeholderField: string;
  valuePadding?: number;
  autoplayIntervalMs?: number;
  label?: string;
  displayFormat?: "hour" | "number";
}

export interface SubViz {
  id: string;
  title: string;
  description: string;
  source?: SourceSpecification;
  layer?: LayerSpecification;
  renderer?: string;
  dataUrl?: string;
  legend?: ProjectLegend;
  timeControl?: TimeControlConfig;
}

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

  // Optional map legend overlay — shown bottom-left of the map.
  legend?: ProjectLegend;

  // Optional time control used by map overlays with time-indexed fields.
  // Example: hourly fields stored as hour_0 ... hour_23.
  timeControl?: TimeControlConfig;

  // Optional sub-visualizations for scrollytelling layout.
  // If present, ProjectDetailView renders one section per sub-viz.
  // Top-level source/layer/renderer are still used for globe preview.
  subViz?: SubViz[];
}
