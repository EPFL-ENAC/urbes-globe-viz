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
let map: maplibregl.Map | null = null;

onMounted(() => {
  if (!mapContainer.value) return;

  // Register PMTiles protocol
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  // Find the layer configuration for this project
  const layerConfig = mapConfig.layers.find(
    (layer) => layer.id === props.projectId,
  );

  if (!layerConfig) {
    console.error(
      `No layer configuration found for project: ${props.projectId}`,
    );
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

  // Initialize map
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
  });

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), "top-right");
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
  // Clean up protocol
  maplibregl.removeProtocol("pmtiles");
});
</script>

<template>
  <div ref="mapContainer" class="project-map"></div>
</template>

<style scoped>
.project-map {
  width: 100%;
  height: 100%;
}
</style>
