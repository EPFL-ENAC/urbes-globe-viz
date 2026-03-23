<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapLayers, projectsGeoJSON } from "@/config/projects";
import { Protocol } from "pmtiles";

const props = defineProps<{
  projectId: string;
  activeTime?: number;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;

// Shared protocol instance to avoid re-registration
let protocolInstance: Protocol | null = null;

const getLayerConfig = () =>
  mapLayers.find((layer) => layer.id === props.projectId);

const buildTemporalField = (
  template: string,
  value: number,
  valuePadding?: number,
) => {
  const roundedValue = Math.round(value);
  const formattedValue = valuePadding
    ? `${roundedValue}`.padStart(valuePadding, "0")
    : `${roundedValue}`;
  return template.replace("{value}", formattedValue);
};

const replacePlaceholderDeep = (
  value: unknown,
  placeholderField: string,
  targetField: string,
): unknown => {
  if (typeof value === "string") {
    return value === placeholderField ? targetField : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      replacePlaceholderDeep(item, placeholderField, targetField),
    );
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        replacePlaceholderDeep(nestedValue, placeholderField, targetField),
      ]),
    );
  }

  return value;
};

const getLayerForTime = (timeValue: number) => {
  const layerConfig = getLayerConfig();
  if (!layerConfig) return null;

  if (!layerConfig.timeControl) {
    return layerConfig.layer;
  }

  const targetField = buildTemporalField(
    layerConfig.timeControl.fieldTemplate,
    timeValue,
    layerConfig.timeControl.valuePadding,
  );

  return replacePlaceholderDeep(
    layerConfig.layer,
    layerConfig.timeControl.placeholderField,
    targetField,
  ) as typeof layerConfig.layer;
};

const applyLayerTime = (timeValue: number) => {
  if (!map) return;

  const layerConfig = getLayerConfig();
  if (!layerConfig || !layerConfig.timeControl) return;

  const timedLayer = getLayerForTime(timeValue);
  if (!timedLayer) return;

  const timedLayerRecord = timedLayer as Record<string, unknown>;
  const filter = timedLayerRecord.filter;
  if (filter) {
    map.setFilter(
      layerConfig.layer.id,
      filter as maplibregl.FilterSpecification,
    );
  }

  const paint = timedLayerRecord.paint;
  if (paint && typeof paint === "object") {
    Object.entries(paint).forEach(([paintKey, paintValue]) => {
      map!.setPaintProperty(layerConfig.layer.id, paintKey, paintValue as any);
    });
  }
};

const ensureProtocol = () => {
  if (!protocolInstance) {
    protocolInstance = new Protocol();
    maplibregl.addProtocol("pmtiles", protocolInstance.tile);
  }
};

const initializeMap = () => {
  if (!mapContainer.value || map) return;

  // Find the layer configuration for this project
  const layerConfig = getLayerConfig();

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
        getLayerForTime(
          props.activeTime ?? layerConfig.timeControl?.initial ?? 0,
        ) ?? layerConfig.layer,
      ],
    },
    center: center,
    zoom: project?.properties.zoom || 8,
    pitch: project?.properties.pitch || 0,
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
  ensureProtocol();
  initializeMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(
  () => props.activeTime,
  (nextValue) => {
    if (nextValue === undefined) return;
    applyLayerTime(nextValue);
  },
);
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
