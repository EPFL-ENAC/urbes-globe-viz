/**
 * Base URL for geodata files (PMTiles, GeoJSON, COG, images).
 * - Dev: served from frontend/public/geodata/ via Vite
 * - Prod: served from the EPFL NAS via nginx
 */
export const geodataBaseUrl = import.meta.env.DEV
  ? "/geodata"
  : "https://urbes-viz.epfl.ch/geodata";
