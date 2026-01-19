import type { Feature, FeatureCollection, Point } from "geojson";

export interface ProjectProperties {
  id: string;
  title: string;
  description: string;
  unit: string;
  info: string;
  category: string;
  year: number;
  preview?: string;
}

export type ProjectFeature = Feature<Point, ProjectProperties>;
export type ProjectCollection = FeatureCollection<Point, ProjectProperties>;

export const projectsGeoJSON: ProjectCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [6.6327, 46.5197], // Geneva
      },
      properties: {
        id: "buildings",
        preview: "buildings_height.png",
        title: "Buildings",
        description: "Swiss building footprints with construction year data",
        unit: "year",
        year: 2023,
        info: "Source: Swiss Federal Office of Topography",
        category: "Infrastructure",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [8.5417, 47.3769], // Zurich
      },
      properties: {
        id: "wrf",
        preview: "climate.png",
        title: "Urban Climate",
        description: "Climate simulation data for Swiss urban areas",
        unit: "",
        year: 2026,
        info: "Source: Aldo Brandi, URBES",
        category: "Climate",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [7.5886, 47.5596], // Basel
      },
      properties: {
        id: "roads_swiss_statistics",
        preview: "traffic.png",
        title: "Traffic",
        description: "Current traffic volume on Swiss roads",
        unit: "vehicles/day",
        year: 2017,
        info: "Source: Swiss Federal Office for Spatial Development",
        category: "Transport",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [7.3592, 47.2108], // Solothurn
      },
      properties: {
        id: "hourly_adult_population",
        title: "Hourly Population",
        preview: "hourly_population.png",
        description: "Dynamic population distribution by hour",
        unit: "adults/500m²",
        year: 2020,
        info: "Source: DAVE Simulations, URBES",
        category: "Demographics",
      },
    },
  ],
};
