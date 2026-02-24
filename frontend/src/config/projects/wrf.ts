import type { ProjectConfig } from "./types";

const baseUrl = import.meta.env.DEV
  ? "/geodata"
  : "https://enacit4r-cdn-s3.epfl.ch/urbes-viz";

export const wrfProject: ProjectConfig = {
  id: "wrf",
  coordinates: [8.5417, 47.3769], // Zurich

  title: "Urban Climate",
  description: "Climate simulation data for Swiss urban areas",
  category: "Climate",
  year: 2026,
  preview: "climate.png",
  zoom: 9,
  pitch: 0,

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
  },
  layer: {
    id: "wrf-layer",
    type: "raster",
    source: "wrf",
    paint: {
      "raster-opacity": 0.5,
    },
  },
};
