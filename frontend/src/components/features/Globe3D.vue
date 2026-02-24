<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { cogProtocol } from "@geomatico/maplibre-cog-protocol";
import { projectsGeoJSON } from "@/config/projects";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";
import { useProjectLayers } from "@/composables/useProjectLayers";
import { useGlobeAnimation } from "@/composables/useGlobeAnimation";

const container = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;

const baseUrlOptions = {
  dev: "/geodata",
  prod: "https://enacit4r-cdn-s3.epfl.ch/urbes-viz",
};

const baseUrl = import.meta.env.DEV ? baseUrlOptions.dev : baseUrlOptions.prod;

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
    maplibregl.addProtocol("cog", cogProtocol);
    pmtilesProtocolRegistered = true;
  }

  // Initialize map with globe projection and performance settings
  map = new maplibregl.Map({
    container: container.value,
    center: [6.3, 46.2], // Switzerland
    zoom: 3, // Start at zoom 10 (middle of range)
    minZoom: 3, // Match file's minimum
    maxZoom: 14, // Match file's maximum
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
        "ghsl-urban": {
          type: "raster",
          url: `cog://${baseUrl}/human_settlement_2025_cog.tif#color:BrewerGreys9,9,30,-`,
          tileSize: 256,
          maxzoom: 14,
        },
        "osm-buildings": {
          type: "vector",
          minzoom: 10,
          url: "https://tiles.openfreemap.org/planet",
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
        // {
        //   id: "land",
        //   type: "fill",
        //   source: "earth-land",
        //   paint: {
        //     "fill-color": "#101010",
        //   },
        // },

        {
          id: "ghsl-layer",
          type: "raster",
          source: "ghsl-urban",
          maxzoom: 15,
          paint: {
            "raster-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              1,
              14,
              0.5,
            ],
          },
        },
        {
          id: "buildings",
          type: "fill",
          source: "osm-buildings",
          "source-layer": "building",
          minzoom: 10,
          paint: {
            "fill-color": "#FFFFFF",
            "fill-outline-color": "#FFFFFF",
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
