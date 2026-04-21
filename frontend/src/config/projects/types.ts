import type { Component } from "vue";
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

// Factory that returns a Promise resolving to a Vue SFC module (e.g. `() => import("./foo.vue")`).
export type DescriptionComponentLoader = () => Promise<{ default: Component }>;

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
  fieldTemplate?: string;
  placeholderField?: string;
  valuePadding?: number;
  autoplayIntervalMs?: number;
  label?: string;
  displayFormat?: "hour" | "number";
}

export interface CogRasterConfig {
  url: string;
  colorScale: string[];
  colorScaleValueRange: [number, number];
  nullColor?: [number, number, number, number];
  opacity?: number;
}

// A selectable climate variable within a COG data source.
// Each variable has its own COG file, color scale, and legend.
export interface CogVariableConfig {
  id: string;
  label: string;
  cogRaster: CogRasterConfig;
  legend?: ProjectLegend;
}

export interface SubViz {
  id: string;
  title: string;
  // Rendered as Markdown (via markdown-it) with inline HTML allowed. So all of
  // these are valid in the same field:
  //   - plain prose: "Swiss building footprints"
  //   - markdown:    "Swiss _building_ footprints - see [source](url)"
  //   - raw HTML:    "<p>Swiss <em>building</em> footprints</p>"
  // For visual coherency across descriptions, stick to normal / italic / links
  // and avoid bold. Descriptions live in committed TS files under PR review,
  // so no runtime sanitization is applied.
  description: string;
  // Escape hatch for charts or other interactive content. When set, overrides
  // `description` at render time. Point at a .vue SFC with a dynamic import,
  // e.g. `() => import("./descriptions/my_project.vue")`.
  descriptionComponent?: DescriptionComponentLoader;
  coordinates?: [number, number];
  zoom?: number;
  source?: SourceSpecification;
  layer?: LayerSpecification;
  renderer?: string;
  dataUrl?: string;
  cogRaster?: CogRasterConfig;
  cogVariables?: CogVariableConfig[];
  legend?: ProjectLegend;
  timeControl?: TimeControlConfig;
}

export interface ProjectConfig {
  // Identity & geography
  id: string;
  coordinates: [number, number]; // [longitude, latitude]

  // Card metadata
  title: string;
  // Rendered as Markdown (via markdown-it) with inline HTML allowed. So all of
  // these are valid in the same field:
  //   - plain prose: "Swiss building footprints"
  //   - markdown:    "Swiss _building_ footprints - see [source](url)"
  //   - raw HTML:    "<p>Swiss <em>building</em> footprints</p>"
  // For visual coherency across descriptions, stick to normal / italic / links
  // and avoid bold. Descriptions live in committed TS files under PR review,
  // so no runtime sanitization is applied.
  description: string;
  // Escape hatch for charts or other interactive content. When set, overrides
  // `description` at render time. Point at a .vue SFC with a dynamic import,
  // e.g. `() => import("./descriptions/my_project.vue")`.
  descriptionComponent?: DescriptionComponentLoader;
  category: string;
  year: number;
  preview?: string;
  zoom?: number;
  // Zoom used by the globe hover preview. Leave undefined to fall back to
  // `zoom - PREVIEW_ZOOM_OFFSET` in Globe3D.vue.
  previewZoom?: number;
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

  // COG raster config — used by "deckgl-cog" renderer (CogRasterMap.vue)
  cogRaster?: CogRasterConfig;

  // Multiple selectable COG variables — shown as chips above the legend.
  // When present, the variable selector overrides cogRaster and legend.
  cogVariables?: CogVariableConfig[];

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
