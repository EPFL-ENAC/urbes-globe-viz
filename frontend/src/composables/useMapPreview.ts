import type maplibregl from "maplibre-gl";
import type { PreviewCamera } from "@/utils/previewMode";
import { projectsGeoJSON } from "@/config/projects";

const CIRCLES_LAYER = "project-circles";
const MANIFEST_URL = "/previews/manifest.json";

// Each project's settled capture camera, written by scripts/generate-previews.mjs
// next to the .png files. `size` is the logical-px side of the square capture
// viewport.
//
// A perspective picture only changes by a scale when the viewport height and
// the zoom change together: a capture `size` px high at zoom `z` is the same
// picture as a live viewport `H` px high at zoom `z + log2(H / size)`, scaled by
// `H / size`. So the hover flies the globe to that fitted zoom (see
// getPreviewCamera) and the image is scaled to match (see positionOverlay). The
// camera padding only moves the picture, it does not change it.
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
  // Violet brand accent — the only colour on the map. Near-white ring keeps the
  // dot legible on both the paper ground and the dark theme.
  ctx.fillStyle = "#a078f0";
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = "#fdfdfd";
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

// --- Composable ---

// Fade-out before the globe flies back out. The globe waits for it (see
// Globe3D.vue), so it never moves under a visible preview.
const FADE_OUT_MS = 150;

// The capture camera, with the zoom fitted to this map's viewport height (see
// the note on PreviewManifest). MapLibre clamps a flyTo to the map's min zoom,
// so the fitted zoom is clamped the same way.
function fitCamera(
  map: maplibregl.Map,
  camera: PreviewCamera,
  size: number,
): PreviewCamera {
  const height = map.getCanvas().clientHeight || size;
  const zoom = Math.min(
    map.getMaxZoom(),
    Math.max(map.getMinZoom(), camera.zoom + Math.log2(height / size)),
  );
  return { ...camera, zoom };
}

// Smallest angle between two bearings, in degrees.
function bearingDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function useMapPreview() {
  // One <img> per Globe3D instance, layered over the map canvas. The capture is
  // data-only over transparency, so the live globe basemap shows through.
  let overlayEl: HTMLImageElement | null = null;
  let activePreviewId: string | null = null;
  // The capture camera + size of the current image.
  let currentCamera: PreviewCamera | null = null;
  let currentSize = CAPTURE_SIZE;
  let trackedMap: maplibregl.Map | null = null;
  let onMove: (() => void) | null = null;
  let onResize: (() => void) | null = null;
  let onSettle: (() => void) | null = null;
  // True while a preview is queued to show and the globe is not at the capture
  // pose yet. The image only shows once the globe stops there.
  let pendingReveal = false;
  // True from the moment the fade-in starts until the image is hidden again.
  let visible = false;

  // Is the globe at the fitted capture pose? The image is only correct there,
  // so it is shown only then. The hover flyTo lands exactly on this pose.
  function isSettledAtCapture(map: maplibregl.Map): boolean {
    if (!currentCamera) return false;
    const target = fitCamera(map, currentCamera, currentSize);
    if (Math.abs(map.getZoom() - target.zoom) > 0.01) return false;
    if (Math.abs(map.getPitch() - target.pitch) > 0.1) return false;
    if (bearingDelta(map.getBearing(), target.bearing) > 0.1) return false;
    // The capture center must sit on the camera center (the padded center of
    // the canvas), within a pixel.
    const p = map.project(target.center);
    const c = map.project(map.getCenter());
    return Math.hypot(p.x - c.x, p.y - c.y) < 1;
  }

  // Hide the image at once, with no fade.
  function hideNow() {
    visible = false;
    if (!overlayEl) return;
    overlayEl.style.transition = "none";
    overlayEl.style.opacity = "0";
    void overlayEl.offsetWidth; // commit the reset before the next transition
  }

  // Fade the queued image in, but only once the globe has stopped at the
  // capture pose (called on moveend).
  function maybeReveal(map: maplibregl.Map) {
    if (!overlayEl || !pendingReveal || !isSettledAtCapture(map)) return;
    pendingReveal = false;
    visible = true;
    const el = overlayEl;
    const id = activePreviewId;
    // Next frame so the opacity:0 state is committed first and the change
    // animates. Check the hover did not move on in the meantime.
    requestAnimationFrame(() => {
      if (el !== overlayEl || activePreviewId !== id || !visible) return;
      el.style.transition = "opacity 250ms ease";
      el.style.opacity = "1";
    });
  }

  // Pin the image to the globe: its centre on the live screen position of the
  // capture center, scaled by the zoom delta. At the fitted zoom the scale is
  // H / size, which is what makes it match (see the note on PreviewManifest).
  function positionOverlay(map: maplibregl.Map) {
    if (!overlayEl || !currentCamera) return;
    const p = map.project(currentCamera.center);
    const s = Math.pow(2, map.getZoom() - currentCamera.zoom);
    const half = (currentSize * s) / 2;
    overlayEl.style.transform = `translate(${p.x - half}px, ${p.y - half}px) scale(${s})`;
  }

  // Safety net: if the camera leaves the capture pose while the image shows,
  // hide it at once, so it is never seen misaligned. If the hover is still on,
  // it shows again when the globe is back at the pose.
  function handleMove(map: maplibregl.Map) {
    positionOverlay(map);
    if (visible && !isSettledAtCapture(map)) {
      hideNow();
      if (activePreviewId) pendingReveal = true;
    }
  }

  // The fitted zoom depends on the viewport height. When it changes with a
  // preview on, jump to the new fitted pose. The move handler hides the image,
  // and moveend shows it again.
  function handleResize(map: maplibregl.Map) {
    positionOverlay(map);
    if (!activePreviewId || !currentCamera) return;
    if (isSettledAtCapture(map)) return;
    pendingReveal = true;
    map.jumpTo(fitCamera(map, currentCamera, currentSize));
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
        "will-change:transform,opacity",
        "z-index:2",
      ].join(";");
      container.appendChild(overlayEl);
      visible = false;
    }
    // One listener set per map; rebinds if the map instance changes.
    if (trackedMap !== map) {
      if (trackedMap && onMove && onResize && onSettle) {
        trackedMap.off("move", onMove);
        trackedMap.off("resize", onResize);
        trackedMap.off("moveend", onSettle);
      }
      onMove = () => handleMove(map);
      onResize = () => handleResize(map);
      onSettle = () => maybeReveal(map);
      map.on("move", onMove);
      map.on("resize", onResize);
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

  /**
   * Fade the image out. The promise resolves once it is hidden, so the caller
   * can wait before it moves the globe.
   */
  function remove(_map: maplibregl.Map): Promise<void> {
    activePreviewId = null;
    pendingReveal = false;
    if (!overlayEl || !visible) {
      hideNow();
      return Promise.resolve();
    }
    visible = false;
    const el = overlayEl;
    el.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    el.style.opacity = "0";
    // Resolve when the fade really ends. A plain timer is not enough: on slow
    // frames the CSS fade starts late and the image is still a bit visible when
    // the timer fires. The fallback timer snaps it hidden, unless a new preview
    // took over in the meantime.
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("transitionend", onEnd);
        clearTimeout(timer);
        if (!activePreviewId) hideNow();
        resolve();
      };
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName === "opacity") finish();
      };
      el.addEventListener("transitionend", onEnd);
      const timer = setTimeout(finish, FADE_OUT_MS + 100);
    });
  }

  /**
   * Queue the project's image. It shows once the globe has stopped at the
   * fitted capture pose (see getPreviewCamera).
   */
  function add(map: maplibregl.Map, projectId: string) {
    const camera = cameraById.get(projectId);
    if (!camera) return;
    const el = ensureOverlay(map);
    if (activePreviewId !== projectId) {
      // Hide at once before the image swap, so the new preview never shows at
      // the old one's screen position.
      hideNow();
      el.src = `/previews/${projectId}.png`;
    }
    currentCamera = camera;
    currentSize = sizeById.get(projectId) ?? CAPTURE_SIZE;
    el.style.width = `${currentSize}px`;
    el.style.height = `${currentSize}px`;
    activePreviewId = projectId;
    // Place it (hidden) so it is ready when it shows.
    positionOverlay(map);
    // Show it on moveend, once the flyTo lands. If the globe is already there,
    // show it now.
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

  /**
   * Camera for the hover flyTo: the capture camera with its zoom fitted to this
   * map's viewport height, so the image matches the globe once it lands.
   */
  function getPreviewCamera(
    map: maplibregl.Map,
    projectId: string,
  ): PreviewCamera | undefined {
    const camera = cameraById.get(projectId);
    if (!camera) return undefined;
    return fitCamera(map, camera, sizeById.get(projectId) ?? CAPTURE_SIZE);
  }

  return { setupIcons, add, remove, filterCircles, getPreviewCamera };
}
