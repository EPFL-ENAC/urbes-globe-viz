<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapLayers, projectsGeoJSON } from "@/config/projects";
import { pmtilesProtocol } from "@/lib/pmtilesClient";
import GhslBasemap from "@/components/features/GhslBasemap.vue";

const props = defineProps<{
  projectId: string;
  activeTime?: number;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const basemapRef = ref<InstanceType<typeof GhslBasemap> | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let unsubscribeBasemapSync: (() => void) | null = null;

let pmtilesRegistered = false;

const getLayerConfig = () =>
  mapLayers.find((layer) => layer.id === props.projectId);

const project = projectsGeoJSON.features.find(
  (f) => f.properties.id === props.projectId,
);
const basemapCenter: [number, number] = (project?.geometry.coordinates as [
  number,
  number,
]) || [8.2, 46.8];
const basemapZoom = project?.properties.zoom || 8;
const basemapPitch = project?.properties.pitch || 0;

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

  if (
    !layerConfig.timeControl?.fieldTemplate ||
    !layerConfig.timeControl?.placeholderField
  ) {
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
  if (!pmtilesRegistered) {
    try {
      maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
    } catch {
      // Already registered by another mount (e.g. GhslBasemap).
    }
    pmtilesRegistered = true;
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

  map = new maplibregl.Map({
    container: mapContainer.value,
    attributionControl: false,
    canvasContextAttributes: { alpha: true, premultipliedAlpha: true },
    style: {
      version: 8,
      sources: {
        [layerConfig.id]: layerConfig.source,
      },
      layers: [
        getLayerForTime(
          props.activeTime ?? layerConfig.timeControl?.initial ?? 0,
        ) ?? layerConfig.layer,
      ],
    },
    center: basemapCenter,
    zoom: basemapZoom,
    pitch: basemapPitch,
    refreshExpiredTiles: false,
    fadeDuration: 500,
    renderWorldCopies: false,
    maxTileCacheSize: 50,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-left");

  map.on("load", () => {
    isLoading.value = false;
  });

  map.on("error", (e) => {
    console.error("Map error:", e);
    isLoading.value = false;
  });

  const attachSync = () => {
    if (unsubscribeBasemapSync || !map || !basemapRef.value?.map) return;
    unsubscribeBasemapSync = basemapRef.value.syncFrom(map);
  };
  attachSync();
  if (!unsubscribeBasemapSync) {
    const stopWatch = watch(
      () => basemapRef.value?.map,
      (bm) => {
        if (bm) {
          attachSync();
          stopWatch();
        }
      },
    );
  }
};

onMounted(() => {
  if (!mapContainer.value) return;
  ensureProtocol();
  initializeMap();
});

onUnmounted(() => {
  if (unsubscribeBasemapSync) {
    unsubscribeBasemapSync();
    unsubscribeBasemapSync = null;
  }
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
    <GhslBasemap
      ref="basemapRef"
      :center="basemapCenter"
      :zoom="basemapZoom"
      :pitch="basemapPitch"
    />
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
  position: relative;
  z-index: 1;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-map-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-text-muted);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
