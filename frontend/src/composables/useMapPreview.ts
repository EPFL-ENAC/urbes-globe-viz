import type maplibregl from "maplibre-gl";
import type { LayerSpecification } from "maplibre-gl";
import { projectsGeoJSON, mapLayers } from "@/config/projects";

const CIRCLES_LAYER = "project-circles";

let activePreviewId: string | null = null;
const imageCache = new Map<string, HTMLImageElement>();

// --- Shared canvas helper ---

function createCircularIcon(
  img: HTMLImageElement | null,
  size: number,
  borderWidth: number,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - borderWidth;

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, size, size);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#c8c8c8";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// --- Composable ---

export function useMapPreview() {
  /** Pre-load all preview images and register small circular marker icons. */
  async function setupIcons(map: maplibregl.Map) {
    const promises = projectsGeoJSON.features.map(async (feature) => {
      const { id, preview } = feature.properties;
      let img: HTMLImageElement | null = null;
      if (preview) {
        try {
          img = await loadImg(`/previews/${preview}`);
          imageCache.set(id, img);
        } catch {
          // fall back to plain grey circle
        }
      }
      const icon = createCircularIcon(img, 40, 3);
      map.addImage(`${id}-marker`, icon, { pixelRatio: 2 });
    });
    await Promise.all(promises);
  }

  function remove(map: maplibregl.Map) {
    if (!activePreviewId) return;
    const layerId = `${activePreviewId}-preview`;
    const imageId = `${activePreviewId}-preview-img`;
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(activePreviewId)) map.removeSource(activePreviewId);
    if (map.hasImage(imageId)) map.removeImage(imageId);
    activePreviewId = null;
  }

  function add(map: maplibregl.Map, projectId: string) {
    const config = mapLayers.find((l) => l.id === projectId);
    if (config) {
      addNativeLayer(map, projectId, config);
      return;
    }
    addImageCircle(map, projectId);
  }

  function filterCircles(map: maplibregl.Map, projectId: string | null) {
    if (!map.getLayer(CIRCLES_LAYER)) return;
    map.setFilter(
      CIRCLES_LAYER,
      projectId ? ["==", ["get", "id"], projectId] : null,
    );
  }

  return { setupIcons, add, remove, filterCircles };
}

// --- Native MapLibre source + layer preview ---

function addNativeLayer(
  map: maplibregl.Map,
  projectId: string,
  config: (typeof mapLayers)[number],
) {
  if (!map.getSource(projectId)) {
    map.addSource(projectId, config.source);
  }
  const layerId = `${projectId}-preview`;
  if (!map.getLayer(layerId)) {
    map.addLayer(
      { ...config.layer, id: layerId, source: projectId } as LayerSpecification,
      CIRCLES_LAYER,
    );
  }
  activePreviewId = projectId;
}

// --- Fallback: enlarge the circular preview marker ---

function addImageCircle(map: maplibregl.Map, projectId: string) {
  const feature = projectsGeoJSON.features.find(
    (f) => f.properties.id === projectId,
  );
  if (!feature?.properties.preview) return;

  const cachedImg = imageCache.get(projectId);
  if (!cachedImg) return;

  activePreviewId = projectId;

  const sourceId = projectId;
  const layerId = `${projectId}-preview`;
  const imageId = `${projectId}-preview-img`;

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "Feature", geometry: feature.geometry, properties: {} },
    });
  }

  const icon = createCircularIcon(cachedImg, 800, 4);
  if (!map.hasImage(imageId)) {
    map.addImage(imageId, icon, { pixelRatio: 2 });
  }
  if (!map.getLayer(layerId)) {
    map.addLayer(
      {
        id: layerId,
        type: "symbol",
        source: sourceId,
        layout: {
          "icon-image": imageId,
          "icon-size": 1,
          "icon-allow-overlap": true,
        },
      },
      CIRCLES_LAYER,
    );
  }
  // Hide the small marker — the large circle replaces it
  if (map.getLayer(CIRCLES_LAYER)) {
    map.setFilter(CIRCLES_LAYER, ["==", ["get", "id"], ""]);
  }
}
