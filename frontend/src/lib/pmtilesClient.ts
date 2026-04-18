import { Protocol, PMTiles } from "pmtiles";

// Singleton protocol shared across every component that mounts a maplibregl.Map.
// Keeping a single instance means the directory cache (header + root + leaf
// directories) is reused — switching from the globe to a project map doesn't
// re-fetch the same metadata.
export const pmtilesProtocol = new Protocol();

const GHSL_LIVE_URL = "https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";
// Local low-zoom sub-pyramid bundled in public/. Same-origin so fetch is fast.
const GHSL_STATIC_URL = "/ghsl-low.pmtiles";

// Kicks off PMTiles header + root-directory range requests for both archives
// (live + local low-zoom) before any map canvas mounts. Called from main.ts,
// so the fetches run in parallel with Vue/Pinia/router/Quasar setup. By the
// time Globe3D mounts, the directory caches are warm and tile reads start
// immediately.
export function prefetchGhsl(): void {
  const live = new PMTiles(GHSL_LIVE_URL);
  pmtilesProtocol.add(live);
  void live.getHeader();

  // The static archive lives at the URL referenced from basemap.ts —
  // the leading slash + relative URL resolves against window.location.origin.
  const staticArchive = new PMTiles(
    new URL(GHSL_STATIC_URL, window.location.origin).toString(),
  );
  pmtilesProtocol.add(staticArchive);
  void staticArchive.getHeader();
}
