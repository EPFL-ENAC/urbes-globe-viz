import type { ProjectConfig } from "./types";
import { geodataBaseUrl as baseUrl } from "../geodata";

export const genevaTreesProject: ProjectConfig = {
  id: "geneva_trees",
  coordinates: [6.1432, 46.188], // Center of Carouge, Geneva

  title: "Geneva Trees (Carouge)",
  description: `
    <p>Inventory of isolated trees in the Canton of Geneva, filtered for the commune of Carouge (to ensure optimal performance).</p>
    <p>Explore the urban canopy of Carouge, Geneva. This map visualizes the spatial distribution, genus diversity, and physical heights of isolated trees across the commune.</p>
    <p>Urban trees help mitigate the heat island effect by shading built surfaces and cooling the air through evapotranspiration, these trees play a vital role in mitigating the local urban heat island effect.</p>
  `,

  // Link to the Vue component that contains the ECharts bar chart
  descriptionComponent: () => import("./descriptions/geneva_trees.vue"),

  category: "Climate",
  year: 2025,
  preview: "geneva_trees.png",
  zoom: 14,
  pitch: 0,
  unit: "trees",
  info: "Source: Geneva Canton Information System (SITG)",

  // GeoJSON source pointing to local public/geodata
  source: {
    type: "geojson",
    data: `${baseUrl}/geneva_trees.geojson`,
  },

  // Circle styling: color coded dynamically by species, size proportional to height
  layer: {
    id: "geneva_trees-layer",
    type: "circle",
    source: "geneva_trees",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "HAUTEUR_TO"],
        0,
        1.5,
        5,
        2.5,
        15,
        5,
        30,
        8,
      ],
      "circle-color": [
        "let",
        "space_idx",
        // Locate the space dividing Genus and Species in the scientific name
        ["index-of", " ", ["get", "NOM_COMPLE"]],
        [
          "match",
          [
            "case",
            // If no space is found, evaluate the full name directly
            ["==", ["var", "space_idx"], -1],
            ["get", "NOM_COMPLE"],
            // Otherwise, slice the string up to the space to extract the Genus (first word)
            ["slice", ["get", "NOM_COMPLE"], 0, ["var", "space_idx"]],
          ],
          "Betula",
          "#88d49e", // Birch
          "Pinus",
          "#1b5e20", // Pine
          "Picea",
          "#004b23", // Spruce
          "Acer",
          "#a3e635", // Maple
          "Carpinus",
          "#38b000", // Hornbeam
          "Quercus",
          "#70e000", // Oak
          "Platanus",
          "#ff9f1c", // Plane
          "Populus",
          "#81c784", // Poplar
          "Tilia",
          "#2b9348", // Linden
          "Aesculus",
          "#e9c46a", // Chestnut
          "Fraxinus",
          "#52b788", // Ash
          "Prunus",
          "#ff85a1", // Cherry
          "Fagus",
          "#e07a5f", // Beech
          "#90a4ae", // Fallback color for other species
        ],
      ],
      "circle-opacity": 0.8,
      "circle-stroke-width": 0.5,
      "circle-stroke-color": "#ffffff",
    },
  },

  // Map legend overlay (bottom-left of the map)
  legend: {
    title: "Tree Species",
    items: [
      { color: "#88d49e", label: "Birch (Betula)", shape: "circle" },
      { color: "#1b5e20", label: "Pine (Pinus)", shape: "circle" },
      { color: "#004b23", label: "Spruce (Picea)", shape: "circle" },
      { color: "#a3e635", label: "Maple (Acer)", shape: "circle" },
      { color: "#38b000", label: "Hornbeam (Carpinus)", shape: "circle" },
      { color: "#70e000", label: "Oak (Quercus)", shape: "circle" },
      { color: "#ff9f1c", label: "Plane (Platanus)", shape: "circle" },
      { color: "#81c784", label: "Poplar (Populus)", shape: "circle" },
      { color: "#2b9348", label: "Linden (Tilia)", shape: "circle" },
      { color: "#e9c46a", label: "Chestnut (Aesculus)", shape: "circle" },
      { color: "#52b788", label: "Ash (Fraxinus)", shape: "circle" },
      { color: "#ff85a1", label: "Cherry/Plum (Prunus)", shape: "circle" },
      { color: "#e07a5f", label: "Beech (Fagus)", shape: "circle" },
      { color: "#90a4ae", label: "Other species", shape: "circle" },
    ],
  },
};
