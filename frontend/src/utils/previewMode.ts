// Build-time screenshot mode. The `generate-previews` script loads project
// pages with `?preview=1` to capture clean map thumbnails: chrome is hidden,
// the map fills the viewport, and the map signals `window.__previewReady` once
// it has settled so the script knows when to capture. Evaluated once at import
// — each capture navigates a fresh page, so a constant is sufficient.
export const isPreviewMode =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("preview");

// Optional `?viz=<subViz id>`: captures a specific sub-visualization instead of
// the project's first one, so e.g. Population dynamics can be previewed by its
// mobility-flow arcs rather than its extruded bars. Ignored outside preview
// mode; an unknown id falls back to the first sub-viz.
export const previewVizId =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("viz")
    : null;

// The camera the settled capture was taken from. The hover preview flies the
// globe to this exact pose and shows the captured image as a screen-aligned
// billboard, so the baked-in pitch/zoom perspective matches the live globe.
export interface PreviewCamera {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

declare global {
  interface Window {
    __previewReady?: boolean;
    __previewCamera?: PreviewCamera;
  }
}
