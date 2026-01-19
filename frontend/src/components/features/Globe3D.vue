<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as MaplibreCOGProtocol from "@geomatico/maplibre-cog-protocol";
import { projectsGeoJSON } from "@/data/projects";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";

const container = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let animationFrame: number | null = null;
let isUserInteracting = false;
let interactionTimeout: number | null = null;
let isHoveringProject = false;
let lastAnimationTime = 0;
const ANIMATION_THROTTLE = 10; // ms between animation frames

const projectStore = useProjectStore();
const router = useRouter();

// Cache for COG protocol to avoid re-registration
let cogProtocolRegistered = false;

// Watch for target coordinates changes and fly to location
watch(
  () => projectStore.targetCoordinates,
  (coords) => {
    if (coords && map) {
      isHoveringProject = true;
      map.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 5,
        duration: 1000,
      });
    } else {
      isHoveringProject = false;
    }
  },
);

onMounted(() => {
  if (!container.value) return;

  // Register COG protocol only once
  const cogUrl = "/geodata/human_settlement_2025_cog.tif";

  if (!cogProtocolRegistered) {
    // Optimized color function with early exit
    MaplibreCOGProtocol.setColorFunction(cogUrl, (pixel, color, metadata) => {
      const val = pixel[0];
      if (val === metadata.noData || val === undefined || val < 12) {
        color.set([0, 0, 0, 0]);
        return;
      }
      const c = Math.min(255, (val * 255) / 30);
      color.set([c, c, c, 255]);
    });

    maplibregl.addProtocol("cog", MaplibreCOGProtocol.cogProtocol);
    cogProtocolRegistered = true;
  }

  // Initialize map with globe projection and performance settings
  map = new maplibregl.Map({
    container: container.value,
    center: [8.2, 46.8],
    zoom: 3,
    minZoom: 2,
    maxZoom: 8,
    refreshExpiredTiles: false,
    maxTileCacheSize: 100,
    style: {
      version: 8,
      projection: {
        type: "globe",
      },
      sources: {
        "earth-land": {
          type: "geojson",
          data: "/geodata/ne_110m_land.geojson",
        },
        "cog-urban": {
          type: "raster",
          url: `cog://${cogUrl}`,
          tileSize: 256,
          maxzoom: 10,
        },
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "#000000",
          },
        },
        {
          id: "land",
          type: "fill",
          source: "earth-land",
          paint: {
            "fill-color": "#101010",
          },
        },
        {
          id: "cog-layer",
          type: "raster",
          source: "cog-urban",
          paint: {
            "raster-resampling": "linear",
            "raster-fade-duration": 0,
          },
        },
      ],
    },
  });

  // Add project markers and set projection after map loads
  map.on("load", () => {
    isLoading.value = false;

    // Add projects as GeoJSON source
    map!.addSource("projects", {
      type: "geojson",
      data: projectsGeoJSON,
    });

    // Add circle layer for projects
    map!.addLayer({
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

    // Change cursor on hover
    map!.on("mouseenter", "project-circles", () => {
      map!.getCanvas().style.cursor = "pointer";
    });

    map!.on("mouseleave", "project-circles", () => {
      map!.getCanvas().style.cursor = "grab";
    });

    // Handle project clicks
    map!.on("click", "project-circles", (e) => {
      if (e.features && e.features[0]) {
        const projectId = e.features[0].properties?.id;
        if (projectId) {
          router.push(`/project/${projectId}`);
        }
      }
    });

    // Handle hover for project store
    map!.on("mousemove", "project-circles", (e) => {
      if (e.features && e.features[0]) {
        const projectId = e.features[0].properties?.id;
        projectStore.setHoveredProject(projectId);
      }
    });

    map!.on("mouseleave", "project-circles", () => {
      projectStore.setHoveredProject(null);
    });
  });

  // Track user interaction
  const startInteraction = () => {
    isUserInteracting = true;
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
    }
  };

  const endInteraction = () => {
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
    }
    interactionTimeout = window.setTimeout(() => {
      isUserInteracting = false;
    }, 3000);
  };

  map.on("dragstart", startInteraction);
  map.on("zoomstart", startInteraction);
  map.on("pitchstart", startInteraction);
  map.on("rotatestart", startInteraction);
  map.on("dragend", endInteraction);
  map.on("zoomend", endInteraction);
  map.on("pitchend", endInteraction);
  map.on("rotateend", endInteraction);

  // Throttled spin animation - only when not interacting and not hovering project
  const animate = (timestamp: number) => {
    if (!isUserInteracting && !isHoveringProject && map) {
      // Throttle animation to reduce CPU usage
      if (timestamp - lastAnimationTime >= ANIMATION_THROTTLE) {
        const center = map.getCenter();
        map.setCenter([center.lng + 0.05, center.lat]);
        lastAnimationTime = timestamp;
      }
    }
    animationFrame = requestAnimationFrame(animate);
  };

  animationFrame = requestAnimationFrame(animate);
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  if (interactionTimeout) {
    clearTimeout(interactionTimeout);
    interactionTimeout = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
  // Keep COG protocol registered for reuse
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
  background: #000;
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
