<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl, { type LayerSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { projectsGeoJSON, mapLayers } from "@/config/projects";
import { basemapSources, basemapLayers } from "@/config/basemap";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";

const container = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const projectStore = useProjectStore();
const router = useRouter();

let map: maplibregl.Map | null = null;
let animationFrame: number | null = null;
let activePreviewId: string | null = null;
let spinActive = true; // spin stops permanently on first user interaction
let pmtilesRegistered = false;

// Camera state saved before hover — restored on unhover
let savedCamera: {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
} | null = null;

const initialCamera = {
  center: [6.3, 46.2] as [number, number],
  zoom: 2,
};

// --- Preview layer management ---

function removePreview() {
  if (!map || !activePreviewId) return;
  const layerId = `${activePreviewId}-preview`;
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(activePreviewId)) map.removeSource(activePreviewId);
  activePreviewId = null;
}

function addPreview(projectId: string) {
  if (!map) return;
  const config = mapLayers.find((l) => l.id === projectId);
  if (!config) return;
  if (!map.getSource(projectId)) {
    map.addSource(projectId, config.source);
  }
  const layerId = `${projectId}-preview`;
  if (!map.getLayer(layerId)) {
    map.addLayer(
      { ...config.layer, id: layerId, source: projectId } as LayerSpecification,
      "project-circles",
    );
  }
  activePreviewId = projectId;
}

function filterCircles(projectId: string | null) {
  if (!map?.getLayer("project-circles")) return;
  map.setFilter(
    "project-circles",
    projectId ? ["==", ["get", "id"], projectId] : null,
  );
}

// --- Spin animation (speed decreases with zoom, stops at zoom ≥ 10) ---

function stopSpin() {
  spinActive = false;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function startSpin() {
  let userInteracted = false;

  const onInteraction = () => {
    userInteracted = true;
    stopSpin();
  };

  const spin = () => {
    if (!spinActive || userInteracted) return;
    if (map) {
      const zoom = map.getZoom();
      if (zoom < 10) {
        const speed = 0.05 * (1 - zoom / 10);
        const c = map.getCenter();
        map.setCenter([c.lng + speed, c.lat]);
      }
    }
    animationFrame = requestAnimationFrame(spin);
  };

  // Any user gesture permanently kills spin
  map
    ?.getCanvas()
    .addEventListener("pointerdown", onInteraction, { once: true });
  map?.getCanvas().addEventListener("wheel", onInteraction, { once: true });

  animationFrame = requestAnimationFrame(spin);
}

// --- Hover watcher: single source of truth ---

watch(
  () => projectStore.hoveredProjectId,
  (projectId) => {
    if (!map) return;

    // First hover permanently kills the idle spin
    if (spinActive) stopSpin();

    map.stop();
    removePreview();
    filterCircles(projectId);

    if (projectId) {
      // Save current camera before zooming in
      const c = map.getCenter();
      savedCamera = {
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      };

      const feature = projectsGeoJSON.features.find(
        (f) => f.properties.id === projectId,
      );
      if (!feature) return;
      const [lng, lat] = feature.geometry.coordinates;
      if (lng && lat)
        map.flyTo({
          center: [lng, lat],
          zoom: feature.properties.zoom || 8,
          pitch: feature.properties.pitch || 0,
          duration: 1200,
        });
      addPreview(projectId);
    } else if (savedCamera) {
      // Restore previous camera instantly
      console.log(savedCamera);
      map.flyTo({
        pitch: 0,
        bearing: 0,
        duration: 1200,
      });
      savedCamera = null;
    }
  },
);

// --- Map setup ---

onMounted(() => {
  if (!container.value) return;

  if (!pmtilesRegistered) {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    pmtilesRegistered = true;
  }

  map = new maplibregl.Map({
    container: container.value,
    center: initialCamera.center,
    zoom: initialCamera.zoom,
    minZoom: 1,
    maxZoom: 15,
    style: {
      version: 8,
      projection: { type: "globe" },
      sources: { ...basemapSources },
      layers: [...basemapLayers],
    },
  });

  map.setPadding({ top: 0, right: 0, bottom: 72, left: 0 });
  map.setPadding(globeViewportPadding);
  projectStore.setMapInstance(map);
  projectStore.setZoomLevel(2);

  // Project markers
  const setupMarkers = () => {
    if (!map || map.getSource("projects")) return;

    map.addSource("projects", { type: "geojson", data: projectsGeoJSON });
    map.addLayer({
      id: "project-circles",
      type: "circle",
      source: "projects",
      paint: {
        "circle-radius": 8,
        "circle-color": "#c8c8c8",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    map.on("mouseenter", "project-circles", () => {
      map!.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "project-circles", () => {
      map!.getCanvas().style.cursor = "grab";
    });
    map.on("click", "project-circles", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) router.push(`/project/${id}`);
    });
    map.on("mousemove", "project-circles", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) projectStore.setHoveredProject(id);
    });
    map.on("mouseleave", "project-circles", () => {
      projectStore.setHoveredProject(null);
    });
  };

  map.once("render", () => {
    isLoading.value = false;
    setupMarkers();
  });
  map.on("load", () => {
    isLoading.value = false;
    setupMarkers();
  });

  startSpin();
  // Track zoom level in store
  map.on("zoom", () => {
    if (map) {
      projectStore.setZoomLevel(map.getZoom());
    }
  });

  // Setup interaction tracking and animation
  setupInteractionTracking();
  startAnimation();
});

onUnmounted(() => {
  stopSpin();
  removePreview();
  cleanupAnimation();
  cleanupLayers();

  projectStore.setMapInstance(null);
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div class="globe-wrapper">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div ref="container" class="globe-container"></div>
  </div>
</template>

<style scoped>
.globe-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background: #000000;
}

.globe-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
