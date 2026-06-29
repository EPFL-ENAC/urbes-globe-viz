// Build-time screenshot mode. The `generate-previews` script loads project
// pages with `?preview=1` to capture clean map thumbnails: chrome is hidden,
// the map fills the viewport, and the map signals `window.__previewReady` once
// it has settled so the script knows when to capture. Evaluated once at import
// — each capture navigates a fresh page, so a constant is sufficient.
export const isPreviewMode =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("preview");

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
