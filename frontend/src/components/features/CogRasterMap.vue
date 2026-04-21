<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { pmtilesProtocol } from "@/lib/pmtilesClient";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { CogBitmapLayer } from "@gisatcz/deckgl-geolib";
import { geodataBaseUrl as baseUrl } from "@/config/geodata";
import GhslBasemap from "@/components/features/GhslBasemap.vue";
import type { CogRasterConfig } from "@/config/projects/types";

const props = defineProps<{
  projectId: string;
  cogRaster: CogRasterConfig;
  activeTime?: number;
  center?: [number, number];
  zoom?: number;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const basemapRef = ref<InstanceType<typeof GhslBasemap> | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let deckOverlay: MapboxOverlay | null = null;
let unsubscribeBasemapSync: (() => void) | null = null;

const initialCenter: [number, number] = props.center ?? [6.5, 46.5];
const initialZoom = props.zoom ?? 8;

const cogUrl = computed(() => {
  const url = props.cogRaster.url;
  return url.startsWith("http") ? url : `${baseUrl}/${url}`;
});

function makeLayers() {
  return [
    new CogBitmapLayer({
      id: `${props.projectId}-cog-${cogUrl.value}`,
      rasterData: cogUrl.value,
      bounds: null,
      isTiled: true,
      cogBitmapOptions: {
        type: "image",
        useHeatMap: true,
        useChannel: (props.activeTime ?? 0) + 1,
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

// When center/zoom changes (subViz switch), fly to new location
watch([() => props.center, () => props.zoom], ([newCenter, newZoom]) => {
  if (map && newCenter) {
    map.flyTo({ center: newCenter, zoom: newZoom ?? 8, duration: 1200 });
  }
});

onMounted(() => {
  if (!mapContainer.value) return;

  try {
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
  } catch {
    // Already registered
  }

  map = new maplibregl.Map({
    container: mapContainer.value,
    canvasContextAttributes: { alpha: true, premultipliedAlpha: true },
    style: {
      version: 8,
      sources: {},
      layers: [],
    },
    center: initialCenter,
    zoom: initialZoom,
    refreshExpiredTiles: false,
    fadeDuration: 500,
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
});

onUnmounted(() => {
  if (unsubscribeBasemapSync) {
    unsubscribeBasemapSync();
    unsubscribeBasemapSync = null;
  }
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
    <GhslBasemap ref="basemapRef" :center="initialCenter" :zoom="initialZoom" />
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
