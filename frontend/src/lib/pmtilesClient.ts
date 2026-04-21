import { Protocol, PMTiles } from "pmtiles";

// Singleton protocol shared across every component that mounts a maplibregl.Map.
// Keeping a single instance means the directory cache (header + root + leaf
// directories) is reused — switching from the globe to a project map doesn't
// re-fetch the same metadata.
export const pmtilesProtocol = new Protocol();

const GHSL_LIVE_URL = "https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";

// Kicks off the PMTiles header + root-directory range request before any map
// canvas mounts. Called from main.ts, so the fetch runs in parallel with
// Vue/Pinia/router/Quasar setup. By the time Globe3D mounts, the directory
// cache is warm and tile reads start immediately.
export function prefetchGhsl(): void {
  const live = new PMTiles(GHSL_LIVE_URL);
  pmtilesProtocol.add(live);
  void live.getHeader();
}
