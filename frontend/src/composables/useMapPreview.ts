import type maplibregl from "maplibre-gl";
import type { PreviewCamera } from "@/utils/previewMode";
import { projectsGeoJSON } from "@/config/projects";

const CIRCLES_LAYER = "project-circles";
const MANIFEST_URL = "/previews/manifest.json";

// Each project's settled capture camera, emitted by scripts/generate-previews.mjs
// alongside the .png files. The hover preview flies the globe to this pose and
// shows the matching image as a billboard, so its baked-in perspective lines up.
// `size` is the logical-px side of the square capture viewport — the image
// represents that many CSS pixels at the capture zoom, which is what lets us
// rescale it to any live zoom (see positionOverlay).
type PreviewManifest = Record<string, { camera: PreviewCamera; size?: number }>;

// Fallback when an older manifest entry has no `size` (capture viewport was
// always this many logical px square — see scripts/generate-previews.mjs).
const CAPTURE_SIZE = 1000;

const cameraById = new Map<string, PreviewCamera>();
const sizeById = new Map<string, number>();
let manifestLoaded = false;

// Keep references so the browser warms the HTTP cache + decode before the first
// hover, instead of fetching the (large) PNG on demand mid-flight.
const preloaded: HTMLImageElement[] = [];

function preloadPreviews() {
  for (const id of cameraById.keys()) {
    const img = new Image();
    img.src = `/previews/${id}.png`;
    preloaded.push(img);
  }
}

// --- Small circular point marker (the always-visible dot on the globe) ---

function createDotIcon(size: number, borderWidth: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2 - borderWidth;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = "#c8c8c8";
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

// --- Composable ---

export function useMapPreview() {
  // One <img> per Globe3D instance, layered over the map canvas. The capture is
  // data-only over transparency, so the live globe basemap shows through.
  let overlayEl: HTMLImageElement | null = null;
  let activePreviewId: string | null = null;
  // The pose + size the visible billboard was captured at. Kept set through the
  // fade-out so it keeps tracking the globe while it shrinks away, instead of
  // freezing mid-screen. Overwritten on the next add().
  let currentCamera: PreviewCamera | null = null;
  let currentSize = CAPTURE_SIZE;
  let trackedMap: maplibregl.Map | null = null;
  let onMove: (() => void) | null = null;
  let onSettle: (() => void) | null = null;
  // Set when a billboard is queued to show but its capture point hasn't entered
  // the globe has settled at the capture pose. Stays true until the flyTo lands,
  // so the preview is only ever shown perfectly aligned, never mid-flight.
  let pendingReveal = false;

  // Has the globe settled at (essentially) the captured pose? The hover flyTo
  // lands exactly on the capture camera, so at that point the billboard is at
  // scale 1 over its capture center — pixel-perfect. We confirm by zoom match +
  // a project→unproject round-trip on the center: an occluded / off-screen point
  // comes back as a different location (unproject returns the front-facing point
  // under that pixel), so an interrupted/mid-flight moveend won't pass.
  function isSettledAtCapture(map: maplibregl.Map): boolean {
    if (!currentCamera) return false;
    if (Math.abs(map.getZoom() - currentCamera.zoom) > 0.5) return false;
    const [lng, lat] = currentCamera.center;
    const p = map.project(currentCamera.center);
    const canvas = map.getCanvas();
    if (
      p.x < 0 ||
      p.y < 0 ||
      p.x > canvas.clientWidth ||
      p.y > canvas.clientHeight
    )
      return false;
    const back = map.unproject(p);
    let dLng = Math.abs(back.lng - lng) % 360;
    if (dLng > 180) dLng = 360 - dLng;
    return dLng < 1 && Math.abs(back.lat - lat) < 1;
  }

  // Fade the queued billboard in, but only once the globe has stopped at the
  // capture pose so it appears perfectly aligned (called on moveend).
  function maybeReveal(map: maplibregl.Map) {
    if (!overlayEl || !pendingReveal || !isSettledAtCapture(map)) return;
    pendingReveal = false;
    const el = overlayEl;
    const id = activePreviewId;
    // Next frame so the opacity:0 state is committed first and the change
    // animates; re-check the hover hasn't moved on in the meantime.
    requestAnimationFrame(() => {
      if (el === overlayEl && activePreviewId === id) el.style.opacity = "1";
    });
  }

  // Pin the billboard to the globe: place its centre at the captured center's
  // live screen position and scale it by the zoom delta. Because the image
  // already baked in the capture's pitch/perspective, a flat image at this
  // position + scale reproduces what that camera saw at the settled pose. We
  // keep it tracking every move so it's correctly placed the instant it reveals,
  // and stays put if the user pans the globe afterwards.
  function positionOverlay(map: maplibregl.Map) {
    if (!overlayEl || !currentCamera) return;
    const p = map.project(currentCamera.center);
    const s = Math.pow(2, map.getZoom() - currentCamera.zoom);
    const half = (currentSize * s) / 2;
    overlayEl.style.transform = `translate(${p.x - half}px, ${p.y - half}px) scale(${s})`;
  }

  function ensureOverlay(map: maplibregl.Map): HTMLImageElement {
    const container = map.getContainer();
    // Recreate if the map was torn down and remounted (detached node).
    if (!overlayEl || overlayEl.parentElement !== container) {
      overlayEl = document.createElement("img");
      overlayEl.className = "map-preview-billboard";
      overlayEl.style.cssText = [
        "position:absolute",
        "top:0",
        "left:0",
        // Sized in add() to the capture's logical px; positioned/scaled via
        // transform in positionOverlay. Origin at top-left so the translate maths
        // is simple (transform applies scale then translate from 0,0).
        "transform-origin:0 0",
        "pointer-events:none",
        "opacity:0",
        // Fades in once the globe has stopped at the capture pose (moveend), so
        // it materializes already perfectly aligned rather than snapping in.
        "transition:opacity 250ms ease",
        "will-change:transform,opacity",
        "z-index:2",
      ].join(";");
      container.appendChild(overlayEl);
    }
    // Track globe motion so the billboard stays pinned to its capture point (so
    // it's correctly placed the instant it reveals and tracks any later pan),
    // and reveal on moveend once the flight has settled at the capture pose.
    // One persistent listener set per map; rebinds if the map instance changes.
    if (trackedMap !== map) {
      if (trackedMap && onMove && onSettle) {
        trackedMap.off("move", onMove);
        trackedMap.off("resize", onMove);
        trackedMap.off("moveend", onSettle);
      }
      onMove = () => positionOverlay(map);
      onSettle = () => maybeReveal(map);
      map.on("move", onMove);
      map.on("resize", onMove);
      map.on("moveend", onSettle);
      trackedMap = map;
    }
    return overlayEl;
  }

  /**
   * Load the camera manifest and register the small point-marker icons.
   * Run once when the globe is ready, before any hover.
   */
  async function setupIcons(map: maplibregl.Map) {
    if (!manifestLoaded) {
      try {
        const res = await fetch(MANIFEST_URL);
        if (res.ok) {
          const manifest = (await res.json()) as PreviewManifest;
          for (const [id, entry] of Object.entries(manifest)) {
            if (entry?.camera) {
              cameraById.set(id, entry.camera);
              sizeById.set(id, entry.size ?? CAPTURE_SIZE);
            }
          }
        }
      } catch {
        // No manifest yet (e.g. previews not generated) — hover billboards are
        // simply skipped; the point markers still render.
      }
      manifestLoaded = true;
      preloadPreviews();
    }

    for (const feature of projectsGeoJSON.features) {
      const imageId = `${feature.properties.id}-marker`;
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, createDotIcon(40, 3), { pixelRatio: 2 });
      }
    }
  }

  /** Fade the active billboard out. */
  function remove(_map: maplibregl.Map) {
    if (overlayEl) overlayEl.style.opacity = "0";
    activePreviewId = null;
    pendingReveal = false;
    // Keep currentCamera so the billboard keeps tracking the globe (shrinking
    // back toward the marker) through the zoom-out flyTo, rather than freezing.
  }

  /** Fade the project's pre-rendered image in, pinned to the globe. */
  function add(map: maplibregl.Map, projectId: string) {
    const camera = cameraById.get(projectId);
    if (!camera) return;
    const el = ensureOverlay(map);
    currentCamera = camera;
    currentSize = sizeById.get(projectId) ?? CAPTURE_SIZE;
    el.style.width = `${currentSize}px`;
    el.style.height = `${currentSize}px`;
    if (activePreviewId !== projectId) {
      // Snap fully hidden with no transition *before* swapping the image, so the
      // new (possibly far-away) preview never ghosts in at the previous
      // billboard's screen position while that one is still fading out. The
      // gated maybeReveal is the only thing that brings it back.
      el.style.transition = "none";
      el.style.opacity = "0";
      void el.offsetWidth; // force reflow so the reset lands before the fade
      el.style.transition = "opacity 250ms ease";
      el.src = `/previews/${projectId}.png`;
    }
    activePreviewId = projectId;
    // Place it (pinned, invisible) so it's ready the instant it reveals.
    positionOverlay(map);
    // Queue the fade-in: it happens only once the flyTo settles at the capture
    // pose (moveend → maybeReveal), so the preview is shown perfectly aligned
    // and never flashes mid-flight. If we're already settled there (e.g. the
    // project is right under the current camera), reveal immediately.
    pendingReveal = true;
    maybeReveal(map);
  }

  function filterCircles(map: maplibregl.Map, projectId: string | null) {
    if (!map.getLayer(CIRCLES_LAYER)) return;
    map.setFilter(
      CIRCLES_LAYER,
      projectId ? ["==", ["get", "id"], projectId] : null,
    );
  }

  /** Capture camera for a project, for the hover flyTo. */
  function getPreviewCamera(projectId: string): PreviewCamera | undefined {
    return cameraById.get(projectId);
  }

  return { setupIcons, add, remove, filterCircles, getPreviewCamera };
}
