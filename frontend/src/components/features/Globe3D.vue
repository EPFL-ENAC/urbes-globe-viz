<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { projectsGeoJSON } from "@/config/projects";
import { basemapSources, basemapLayers } from "@/config/basemap";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";
import { useProjectLayers } from "@/composables/useProjectLayers";
import { useGlobeAnimation } from "@/composables/useGlobeAnimation";

const container = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
const globeViewportPadding: maplibregl.PaddingOptions = {
  top: 0,
  right: 0,
  bottom: 72,
  left: 0,
};

const projectStore = useProjectStore();
const router = useRouter();

// Composables
const getMap = () => map;
const { cleanup: cleanupLayers } = useProjectLayers(getMap);
const {
  isHoveringProject,
  setupInteractionTracking,
  startAnimation,
  cleanup: cleanupAnimation,
} = useGlobeAnimation(getMap);

// Cache for protocol registration
let pmtilesProtocolRegistered = false;

// Watch for target coordinates changes and fly to location
watch(
  () => projectStore.targetCoordinates,
  (coords) => {
    if (coords && map) {
      isHoveringProject.value = true;

      // Get project to access zoom and pitch
      const project = projectsGeoJSON.features.find(
        (f) =>
          f.geometry.coordinates[0] === coords.longitude &&
          f.geometry.coordinates[1] === coords.latitude,
      );

      map.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: project?.properties.zoom || 8,
        pitch: project?.properties.pitch || 0,
        duration: 1000,
      });
    } else {
      isHoveringProject.value = false;
    }
  },
);

onMounted(() => {
  if (!container.value) return;

  // Register PMTiles protocol
  if (!pmtilesProtocolRegistered) {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    pmtilesProtocolRegistered = true;
  }

  // Initialize map with globe projection and performance settings
  map = new maplibregl.Map({
    container: container.value,
    center: [6.3, 46.2], // Switzerland
    zoom: 2, // Start at zoom 10 (middle of range)
    minZoom: 1, // Match file's minimum
    maxZoom: 15, // Match file's maximum
    style: {
      version: 8,
      projection: {
        type: "globe",
      },
      sources: { ...basemapSources },
      layers: [...basemapLayers],
    },
  });

  map.setPadding(globeViewportPadding);

  // Add project markers and set projection after map loads
  const setupProjectMarkers = () => {
    if (!map || map.getSource("projects")) return;

    map.addSource("projects", {
      type: "geojson",
      data: projectsGeoJSON,
    });

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
      if (e.features && e.features[0]) {
        const projectId = e.features[0].properties?.id;
        if (projectId) {
          router.push(`/project/${projectId}`);
        }
      }
    });

    map.on("mousemove", "project-circles", (e) => {
      if (e.features && e.features[0]) {
        const projectId = e.features[0].properties?.id;
        projectStore.setHoveredProject(projectId);
      }
    });

    map.on("mouseleave", "project-circles", () => {
      projectStore.setHoveredProject(null);
    });
  };

  map.once("render", () => {
    isLoading.value = false;
    setupProjectMarkers();
  });

  // Fallback: load fires normally when PMTiles doesn't block it
  map.on("load", () => {
    isLoading.value = false;
    setupProjectMarkers();
  });

  // Setup interaction tracking and animation
  setupInteractionTracking();
  startAnimation();
});

onUnmounted(() => {
  cleanupAnimation();
  cleanupLayers();

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
