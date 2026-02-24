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
  zoom?: number;
  pitch?: number;
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
        coordinates: [6.6327, 46.5397], // Geneva
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
        zoom: 13,
        pitch: 75,
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
        zoom: 9,
        pitch: 0,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [6.58, 46.51], // Lausanne
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
        zoom: 10,
        pitch: 0,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [6.58, 46.41], // Lausanne
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
        zoom: 9,
        pitch: 70,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [6.5, 46.55], // Vaud-Geneva region
      },
      properties: {
        id: "dave_flows_work",
        title: "Work Commute Flows (DAVE)",
        description:
          "Origin-destination mobility flows for the work environment at 10am, modelled by the DAVE activity-based simulation for the Vaud-Geneva region (500m grid).",
        unit: "persons",
        year: 2024,
        info: "Source: DAVE simulation model, EPFL",
        category: "Mobility",
        zoom: 9,
        pitch: 0,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [120.5, 30.5], // Zhejiang/Jiangsu region, China
      },
      properties: {
        id: "building_heights_china",
        title: "Building China",
        preview: "building_heights_china.png",
        description:
          "Observed and simulated building heights across Chinese cities",
        unit: "meters",
        year: 1995,
        info: "Source: URBES Research",
        category: "Infrastructure",
        zoom: 6,
        pitch: 60,
      },
    },
  ],
};
