import type { Feature, FeatureCollection, Point } from "geojson";
import type { ProjectConfig } from "./types";
import { buildingsProject } from "./buildings";
import { wrfProject } from "./wrf";
import { roadsSwissStatisticsProject } from "./roads_swiss_statistics";
import { hourlyAdultPopulationProject } from "./hourly_adult_population";
import { daveFlowsWorkProject } from "./dave_flows_work";
import { buildingHeightsChinaProject } from "./building_heights_china";

// ─── All projects — add new project imports + entries here ───────────────────
const allProjects: ProjectConfig[] = [
  buildingsProject,
  wrfProject,
  roadsSwissStatisticsProject,
  hourlyAdultPopulationProject,
  daveFlowsWorkProject,
  buildingHeightsChinaProject,
];

// ─── Re-export for consumers that need the raw config ────────────────────────
export type { ProjectConfig };
export { allProjects };

// ─── GeoJSON FeatureCollection (replaces data/projects.ts) ───────────────────
export interface ProjectProperties {
  id: string;
  title: string;
  description: string;
  unit: string;
  info: string;
  category: string;
  year: number;
  preview?: string;
  zoom?: number;
  pitch?: number;
  renderer?: string;
}

export type ProjectFeature = Feature<Point, ProjectProperties>;
export type ProjectCollection = FeatureCollection<Point, ProjectProperties>;

export const projectsGeoJSON: ProjectCollection = {
  type: "FeatureCollection",
  features: allProjects.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: p.coordinates },
    properties: {
      id: p.id,
      title: p.title,
      description: p.description,
      unit: p.unit,
      info: p.info,
      category: p.category,
      year: p.year,
      preview: p.preview,
      zoom: p.zoom,
      pitch: p.pitch,
      renderer: p.renderer,
    },
  })),
};

// ─── MapLibre layer configs (replaces mapConfig.layers) ──────────────────────
export interface MapLayerConfig {
  id: string;
  label: string;
  unit: string;
  info: string;
  source: NonNullable<ProjectConfig["source"]>;
  layer: NonNullable<ProjectConfig["layer"]>;
}

export const mapLayers: MapLayerConfig[] = allProjects
  .filter(
    (
      p,
    ): p is ProjectConfig & {
      source: NonNullable<ProjectConfig["source"]>;
      layer: NonNullable<ProjectConfig["layer"]>;
    } => p.source !== undefined && p.layer !== undefined,
  )
  .map((p) => ({
    id: p.id,
    label: p.title,
    unit: p.unit,
    info: p.info,
    source: p.source,
    layer: p.layer,
  }));
