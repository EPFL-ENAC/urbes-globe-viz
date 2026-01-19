<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapConfig } from "@/config/mapConfig";
import { Protocol } from "pmtiles";
import { projectsGeoJSON } from "@/data/projects";

const props = defineProps<{
  projectId: string;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const isVisible = ref(false);
let map: maplibregl.Map | null = null;
let observer: IntersectionObserver | null = null;

// Shared protocol instance to avoid re-registration
let protocolInstance: Protocol | null = null;

const ensureProtocol = () => {
  if (!protocolInstance) {
    protocolInstance = new Protocol();
    maplibregl.addProtocol("pmtiles", protocolInstance.tile);
  }
};

const initializeMap = () => {
  if (!mapContainer.value || map) return;

  // Find the layer configuration for this project
  const layerConfig = mapConfig.layers.find(
    (layer) => layer.id === props.projectId,
  );

  if (!layerConfig) {
    console.error(
      `No layer configuration found for project: ${props.projectId}`,
    );
    isLoading.value = false;
    return;
  }

  // Get project coordinates from GeoJSON
  const project = projectsGeoJSON.features.find(
    (f) => f.properties.id === props.projectId,
  );
  const center: [number, number] = (project?.geometry.coordinates as [
    number,
    number,
  ]) || [8.2, 46.8];

  // Initialize map with optimized settings
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        [layerConfig.id]: layerConfig.source,
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "rgb(20, 20, 20)",
          },
        },
        layerConfig.layer,
      ],
    },
    center: center,
    zoom: 8,
    // Performance optimizations
    refreshExpiredTiles: false,
    fadeDuration: 0, // Disable fade animation for faster rendering
    renderWorldCopies: false,
    maxTileCacheSize: 50, // Limit tile cache size
  });

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // Handle loading state
  map.on("load", () => {
    isLoading.value = false;
  });

  // Handle errors
  map.on("error", (e) => {
    console.error("Map error:", e);
    isLoading.value = false;
  });
};

onMounted(() => {
  if (!mapContainer.value) return;

  // Ensure PMTiles protocol is registered (only once globally)
  ensureProtocol();

  // Use Intersection Observer for lazy loading
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isVisible.value) {
          isVisible.value = true;
          initializeMap();
          // Stop observing once initialized
          if (observer && mapContainer.value) {
            observer.unobserve(mapContainer.value);
          }
        }
      });
    },
    {
      threshold: 0.1, // Initialize when 10% visible
      rootMargin: "50px", // Start loading 50px before visible
    },
  );

  if (mapContainer.value) {
    observer.observe(mapContainer.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
  // Don't remove protocol - keep it registered for reuse
});
</script>

<template>
  <div class="project-map-wrapper">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div ref="mapContainer" class="project-map"></div>
  </div>
</template>

<style scoped>
.project-map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.project-map {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgb(20, 20, 20);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
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
