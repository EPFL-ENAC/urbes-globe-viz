import type {
  ImageSourceSpecification,
  LayerSpecification,
  SourceSpecification,
  VectorSourceSpecification,
} from "maplibre-gl";

export interface MapLayerConfig {
  id: string;
  label: string;
  unit: string;
  info: string;
  source: SourceSpecification;
  layer: LayerSpecification;
}

const baseUrlOptions = {
  dev: "/geodata",
  prod: "https://enacit4r-cdn.epfl.ch/urbes-viz",
};

const baseUrl = import.meta.env.DEV ? baseUrlOptions.dev : baseUrlOptions.prod;

export const mapConfig = {
  // Map layers with their associated sources
  baseUrl: baseUrlOptions,
  layers: [
    {
      id: "buildings",
      label: "Buildings",
      unit: "year",
      info: "Source: Swiss Federal Office of Topography",
      source: {
        type: "vector",
        url: `pmtiles://${baseUrl}/buildings_swiss.pmtiles`,
        minzoom: 5, // Minimum zoom level to display buildings
      } as VectorSourceSpecification,
      layer: {
        id: "buildings-layer",
        type: "fill-extrusion",
        source: "buildings",
        "source-layer": "buildings_swiss",
        paint: {
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["to-number", ["get", "OBJORIG_YE"]],
            1950,
            10,
            2000,
            50,
            2020,
            100,
          ],
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["to-number", ["get", "OBJORIG_YE"]],
            1950,
            "#FF0000",
            2000,
            "#FFFF00",
            2020,
            "#00FF00",
          ],
          "fill-extrusion-base": [
            "case",
            [">=", ["get", "zoom"], 16],
            ["get", "render_min_height"],
            0,
          ],
        },
      } as LayerSpecification,
    },
    {
      id: "wrf",
      label: "Urban climate",
      unit: "",
      info: "Source: Aldo Brandi, URBES",
      source: {
        type: "image",
        url: `${baseUrl}/wrf_t2/t2_012.png`,
        coordinates: [
          [5.13211, 47.94587],
          [11.12701, 47.94587],
          [11.12701, 45.42068],
          [5.13211, 45.42068],
        ],
      } as ImageSourceSpecification,
      volatile: true,
      layer: {
        id: "wrf-layer",
        type: "raster",
        source: "wrf",
        paint: {
          "raster-opacity": 0.5,
        },
      } as LayerSpecification,
    },
    {
      id: "roads_swiss_statistics",
      label: "Traffic 2017",
      unit: "vehicles/day",
      info: "Source: Swiss Federal Office for Spatial Development",
      source: {
        type: "vector",
        url: `pmtiles://${baseUrl}/roads_swiss_statistics.pmtiles`,
      } as VectorSourceSpecification,
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
      } as LayerSpecification,
    },
    {
      id: "hourly_adult_population",
      label: "Hourly Adult Population",
      unit: "adults/500m²",
      info: "Source: DAVE Simulations, URBES",
      source: {
        type: "vector",
        url: `pmtiles://${baseUrl}/hourly_adult_population.pmtiles`,
      } as VectorSourceSpecification,
      layer: {
        id: "hourly_adult_population-layer",
        type: "fill-extrusion",
        source: "hourly_adult_population",
        "source-layer": "hourly_adult_population_wgs84",
        filter: [">=", ["get", "hour_12"], 5],
        paint: {
          // Height scaled to make high population areas tall
          "fill-extrusion-height": [
            "*",
            ["get", "hour_12"],
            5, // Scale factor for height - adjust to make taller/shorter
          ],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.8,
          // Matplotlib 'cool' colormap: cyan -> blue -> magenta -> pink
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "hour_12"],
            0,
            "#00ffff", // Cyan (cool start)
            500,
            "#0080FF", // Blue
            1000,
            "#4000FF", // Purple
            2000,
            "#8000FF", // Violet
            3000,
            "#C000FF", // Magenta
            4000,
            "#FF00FF", // Bright magenta
            5000,
            "#FF80FF", // Pink (cool end)
          ],
        },
      } as LayerSpecification,
    },
    {
      id: "dave_flows_work",
      label: "Work Flows",
      unit: "persons",
      info: "Source: DAVE simulation, EPFL",
      source: {
        type: "vector",
        url: `pmtiles://${baseUrl}/dave_flows_work.pmtiles`,
        minzoom: 5,
      } as VectorSourceSpecification,
      layer: {
        id: "dave_flows_work-layer",
        type: "line",
        source: "dave_flows_work",
        "source-layer": "dave_flows",
        paint: {
          "line-color": [
            "interpolate",
            ["linear"],
            ["get", "flow"],
            1,
            "#1a1035",
            10,
            "#4a1060",
            50,
            "#9b2196",
            200,
            "#e040fb",
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["get", "flow"],
            1,
            0.5,
            50,
            2,
            200,
            4,
          ],
          "line-opacity": 0.7,
        },
      } as LayerSpecification,
    },
    {
      id: "building_heights_china",
      label: "Building Heights China",
      unit: "meters",
      info: "Source: URBES Research",
      source: {
        type: "vector",
        url: `pmtiles://${baseUrl}/building_heights_china.pmtiles`,
      } as VectorSourceSpecification,
      layer: {
        id: "building_heights_china-layer",
        type: "circle",
        source: "building_heights_china",
        "source-layer": "building_heights_china",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4,
            2,
            8,
            8,
            12,
            16,
          ],
          "circle-opacity": 0.8,
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "height_fit"],
            0,
            "#ffffcc", // Light yellow for low heights
            2.0,
            "#ffeda0",
            3.0,
            "#fed976",
            4.0,
            "#feb24c",
            5.0,
            "#fd8d3c",
            6.0,
            "#fc4e2a",
            8.0,
            "#e31a1c",
            10.0,
            "#bd0026",
            12.0,
            "#800026", // Dark red for high heights
          ],
          "circle-stroke-width": 0,
        },
      } as LayerSpecification,
    },
  ] as MapLayerConfig[],
};
