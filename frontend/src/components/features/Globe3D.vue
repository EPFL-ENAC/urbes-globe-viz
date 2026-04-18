<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { pmtilesProtocol } from "@/lib/pmtilesClient";
import { projectsGeoJSON } from "@/config/projects";
import { basemapSources, basemapLayers } from "@/config/basemap";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";
import { useMapPreview } from "@/composables/useMapPreview";

const container = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const projectStore = useProjectStore();
const router = useRouter();
const preview = useMapPreview();

let map: maplibregl.Map | null = null;
let animationFrame: number | null = null;
let spinActive = true; // spin stops permanently on first user interaction
let pmtilesRegistered = false;
let flyingToProject = false; // true while a hover-triggered flyTo is in progress

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

// --- Preview layer management (delegated to useMapPreview) ---

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

    flyingToProject = false;
    map.stop();
    preview.remove(map);
    preview.filterCircles(map, projectId);

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
      if (lng && lat) {
        flyingToProject = true;
        map.flyTo({
          center: [lng, lat],
          zoom: feature.properties.zoom || 8,
          pitch: feature.properties.pitch || 0,
          duration: 1200,
        });
        map.once("moveend", () => {
          flyingToProject = false;
        });
      }
      preview.add(map, projectId);
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

  // Pinia survives route changes; stale hover/zoom hid the hero.
  savedCamera = null;
  projectStore.setHoveredProject(null);
  projectStore.setZoomLevel(initialCamera.zoom);

  if (!pmtilesRegistered) {
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
    pmtilesRegistered = true;
  }

  map = new maplibregl.Map({
    container: container.value,
    center: initialCamera.center,
    zoom: initialCamera.zoom,
    minZoom: 1,
    maxZoom: 15,
    attributionControl: false,
    fadeDuration: 500,
    style: {
      version: 8,
      projection: { type: "globe" },
      sources: { ...basemapSources },
      layers: [...basemapLayers],
    },
  });

  map.setPadding({ top: 0, right: 0, bottom: 72, left: 0 });
  projectStore.setZoomLevel(2);

  // Project markers
  const setupMarkers = async () => {
    if (!map || map.getSource("projects")) return;

    await preview.setupIcons(map);

    map.addSource("projects", { type: "geojson", data: projectsGeoJSON });
    map.addLayer({
      id: "project-circles",
      type: "symbol",
      source: "projects",
      layout: {
        "icon-image": ["concat", ["get", "id"], "-marker"],
        "icon-size": 1,
        "icon-allow-overlap": true,
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
      if (!flyingToProject) {
        projectStore.setHoveredProject(null);
      }
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
});

// React to zoom requests from other components (e.g. HeroSection dot nav)
watch(
  () => projectStore.targetZoom,
  (zoom) => {
    if (zoom == null || !map) return;
    map.easeTo({ zoom, duration: 600 });
    projectStore.targetZoom = null;
  },
);

onUnmounted(() => {
  stopSpin();
  if (map) preview.remove(map);
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
