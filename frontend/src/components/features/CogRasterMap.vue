<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { CogBitmapLayer } from "@gisatcz/deckgl-geolib";
import { projectsGeoJSON } from "@/config/projects";
import { basemapSources, basemapLayers } from "@/config/basemap";
import { geodataBaseUrl as baseUrl } from "@/config/geodata";
import type { CogRasterConfig } from "@/config/projects/types";

const props = defineProps<{
  projectId: string;
  cogRaster: CogRasterConfig;
  activeTime?: number;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let deckOverlay: MapboxOverlay | null = null;

const cogUrl = computed(() => {
  const url = props.cogRaster.url;
  return url.startsWith("http") ? url : `${baseUrl}/${url}`;
});

function makeLayers() {
  return [
    new CogBitmapLayer({
      id: `${props.projectId}-cog`,
      rasterData: cogUrl.value,
      bounds: null,
      isTiled: true,
      cogBitmapOptions: {
        type: "image",
        format: "float32",
        useHeatMap: true,
        useChannelIndex: props.activeTime ?? 0,
        colorScale: props.cogRaster.colorScale,
        colorScaleValueRange: props.cogRaster.colorScaleValueRange,
        nullColor: props.cogRaster.nullColor ?? [0, 0, 0, 0],
      },
      opacity: props.cogRaster.opacity ?? 0.8,
    }),
  ];
}

function updateLayers() {
  if (deckOverlay) {
    deckOverlay.setProps({ layers: makeLayers() });
  }
}

// When band (timestep) changes, update the layer
watch(() => props.activeTime, updateLayers);

// When cogRaster config changes (subViz switch), recreate layers
watch(() => props.cogRaster, updateLayers, { deep: true });

onMounted(() => {
  if (!mapContainer.value) return;

  try {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
  } catch {
    // Already registered
  }

  const project = projectsGeoJSON.features.find(
    (f) => f.properties.id === props.projectId,
  );
  const center: [number, number] = (project?.geometry.coordinates as [
    number,
    number,
  ]) || [6.5, 46.5];

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: { ...basemapSources },
      layers: [...basemapLayers],
    },
    center,
    zoom: project?.properties.zoom || 8,
    pitch: project?.properties.pitch || 0,
    refreshExpiredTiles: false,
    fadeDuration: 0,
    renderWorldCopies: false,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  map.on("load", () => {
    isLoading.value = false;

    deckOverlay = new MapboxOverlay({
      interleaved: false,
      layers: makeLayers(),
    });
    map!.addControl(deckOverlay as unknown as maplibregl.IControl);
  });
});

onUnmounted(() => {
  if (deckOverlay && map) {
    map.removeControl(deckOverlay as unknown as maplibregl.IControl);
  }
  if (map) {
    map.remove();
    map = null;
  }
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
  background: #000;
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
