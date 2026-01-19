<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as MaplibreCOGProtocol from "@geomatico/maplibre-cog-protocol";
import { projectsGeoJSON } from "@/data/projects";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";

const container = ref<HTMLDivElement | null>(null);
let map: maplibregl.Map | null = null;
let animationFrame: number | null = null;
let isUserInteracting = false;
let interactionTimeout: number | null = null;
let isHoveringProject = false;

const projectStore = useProjectStore();
const router = useRouter();

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

  // Register COG protocol
  const cogUrl = "/geodata/human_settlement_2025_cog.tif";

  MaplibreCOGProtocol.setColorFunction(cogUrl, (pixel, color, metadata) => {
    const val = pixel[0];
    if (val === metadata.noData || val === undefined || val < 12) {
      color.set([0, 0, 0, 0]);
    } else {
      const c = Math.min(255, (val * 255) / 50) + 50;
      color.set([c, c, c, 255]);
    }
  });

  maplibregl.addProtocol("cog", MaplibreCOGProtocol.cogProtocol);

  // Initialize map with globe projection
  map = new maplibregl.Map({
    container: container.value,
    center: [8.2, 46.8],
    zoom: 3,
    minZoom: 2,
    maxZoom: 6,
    style: {
      version: 8,
      sources: {
        "earth-land": {
          type: "geojson",
          data: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_land.geojson",
        },
        "cog-urban": {
          type: "raster",
          url: `cog://${cogUrl}`,
          tileSize: 256,
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
            "fill-color": "#151515",
          },
        },
        {
          id: "cog-layer",
          type: "raster",
          source: "cog-urban",
        },
      ],
    },
  });

  // Add project markers and set projection after map loads
  map.on("load", () => {
    // Set globe projection
    map!.setProjection({
      type: "globe",
    });

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

  // Spin animation - only when not interacting and not hovering project
  const animate = () => {
    if (!isUserInteracting && !isHoveringProject && map) {
      const center = map.getCenter();
      map.setCenter([center.lng + 0.05, center.lat]);
    }
    animationFrame = requestAnimationFrame(animate);
  };

  animate();
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  if (interactionTimeout) {
    clearTimeout(interactionTimeout);
  }
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div ref="container" class="globe-container"></div>
</template>

<style scoped>
.globe-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background: #000;
}
</style>
