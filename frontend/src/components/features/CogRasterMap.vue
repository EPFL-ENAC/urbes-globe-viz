<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { registerProtocols } from "@/lib/pmtilesClient";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";
import { CogBitmapLayer } from "@gisatcz/deckgl-geolib";
import { geodataBaseUrl as baseUrl } from "@/config/geodata";
import GhslBasemap from "@/components/features/GhslBasemap.vue";
import { isPreviewMode } from "@/utils/previewMode";
import type { CogRasterConfig } from "@/config/projects/types";

const props = defineProps<{
  projectId: string;
  cogRaster: CogRasterConfig;
  activeTime?: number;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  // Optional JSON of arrows drawn on top of the raster (e.g. wind direction).
  arrowsUrl?: string;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const basemapRef = ref<InstanceType<typeof GhslBasemap> | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let deckOverlay: MapboxOverlay | null = null;
let unsubscribeBasemapSync: (() => void) | null = null;

const initialCenter: [number, number] = props.center ?? [6.5, 46.5];
const initialZoom = props.zoom ?? 8;
const initialPitch = props.pitch ?? 0;

const cogUrl = computed(() => resolveUrl(props.cogRaster.url));

// Wind arrows: [lon, lat, direction the wind comes from (deg north), speed].
type ArrowPoint = [number, number, number, number];
interface ArrowsFile {
  spacing_m: number;
  points: ArrowPoint[];
}

// One arrow pointing up (north), dark with a white edge so it reads on any
// colour of the raster.
const ARROW_ICON = {
  id: "arrow",
  url:
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
        '<path d="M32 6 L45 28 L35.5 28 L35.5 58 L28.5 58 L28.5 28 L19 28 Z" fill="#1a1a1a" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>' +
        "</svg>",
    ),
  width: 64,
  height: 64,
  anchorY: 32,
};

const arrows = shallowRef<ArrowsFile | null>(null);

function resolveUrl(url: string) {
  return url.startsWith("http") ? url : `${baseUrl}/${url}`;
}

watch(
  () => props.arrowsUrl,
  async (url) => {
    arrows.value = null;
    updateLayers();
    if (!url) return;
    try {
      const res = await fetch(resolveUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ArrowsFile;
      // The user may have switched variable while we were loading.
      if (props.arrowsUrl !== url) return;
      arrows.value = data;
      updateLayers();
    } catch (err) {
      console.error(`Could not load arrows ${url}`, err);
    }
  },
  { immediate: true },
);

function makeArrowLayer(file: ArrowsFile) {
  return new IconLayer<ArrowPoint>({
    id: `${props.projectId}-arrows-${props.arrowsUrl}`,
    data: file.points,
    getPosition: (d) => [d[0], d[1]],
    getIcon: () => ARROW_ICON,
    // deck.gl angles turn counter-clockwise. The arrow points where the wind
    // goes, so direction + 180, clockwise.
    getAngle: (d) => 180 - d[2],
    // Sized in meters from the grid spacing, so arrows never overlap and
    // follow the zoom. Lie flat on the map so they turn with its bearing.
    getSize: file.spacing_m * 0.6,
    sizeUnits: "meters",
    sizeMinPixels: 8,
    sizeMaxPixels: 32,
    billboard: false,
    opacity: 0.9,
  });
}

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
    ...(arrows.value ? [makeArrowLayer(arrows.value)] : []),
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

  registerProtocols();

  map = new maplibregl.Map({
    container: mapContainer.value,
    canvasContextAttributes: { alpha: true, premultipliedAlpha: true },
    style: {
      version: 8,
      // Kept on mercator even for previews: the deck.gl COG overlay doesn't
      // sync reliably with globe projection, and COG projects sit at high
      // enough zoom that globe vs mercator is visually negligible.
      sources: {},
      layers: [],
    },
    center: initialCenter,
    zoom: initialZoom,
    pitch: initialPitch,
    refreshExpiredTiles: false,
    fadeDuration: 500,
    renderWorldCopies: false,
    attributionControl: false,
  });

  if (!isPreviewMode) {
    map.addControl(new maplibregl.NavigationControl(), "top-left");
  }

  map.on("load", () => {
    isLoading.value = false;

    deckOverlay = new MapboxOverlay({
      interleaved: false,
      layers: makeLayers(),
    });
    map!.addControl(deckOverlay as unknown as maplibregl.IControl);

    // Build-time screenshot: signal once maplibre has settled. The deck.gl COG
    // tiles load via HTTP range requests afterwards; the capture script waits
    // for network idle on top of this to let those finish painting.
    if (isPreviewMode) {
      map!.once("idle", () => {
        window.__previewCamera = {
          center: map!.getCenter().toArray() as [number, number],
          zoom: map!.getZoom(),
          pitch: map!.getPitch(),
          bearing: map!.getBearing(),
        };
        window.__previewReady = true;
      });
    }
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
    <GhslBasemap
      v-if="!isPreviewMode"
      ref="basemapRef"
      :center="initialCenter"
      :zoom="initialZoom"
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
