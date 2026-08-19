<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { pmtilesProtocol } from "@/lib/pmtilesClient";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { projectsGeoJSON } from "@/config/projects";
import { geodataBaseUrl as baseUrl } from "@/config/geodata";
import GhslBasemap from "@/components/features/GhslBasemap.vue";
import { isPreviewMode } from "@/utils/previewMode";

const props = defineProps<{
  projectId: string;
  dataUrl?: string;
}>();

const flowUrl = computed(() =>
  props.dataUrl
    ? `${baseUrl}/${props.dataUrl}`
    : `${baseUrl}/${props.projectId}.geojson`,
);
const BRUSH_RADIUS_M = 8000;

// Capture-only arc tuning (issue #18: "I don't see the arcs in the mobility
// preview"). The interactive map is where users explore colour and detail; the
// landing-page billboard has to stay inside the black/white/purple palette and
// stay legible at a far-out framing, so captures get their own numbers.
const PREVIEW_ARC_COUNT = 400;
// The theme's own ramp: --color-accent-strong -> --color-accent-soft.
const PREVIEW_ARC_SOURCE: [number, number, number, number] = [
  138, 92, 240, 235,
];
const PREVIEW_ARC_TARGET: [number, number, number, number] = [
  236, 227, 253, 235,
];

const mapContainer = ref<HTMLDivElement | null>(null);
const basemapRef = ref<InstanceType<typeof GhslBasemap> | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let deckOverlay: MapboxOverlay | null = null;
let unsubscribeBasemapSync: (() => void) | null = null;

const project = projectsGeoJSON.features.find(
  (f) => f.properties.id === props.projectId,
);
const basemapCenter: [number, number] = (project?.geometry.coordinates as [
  number,
  number,
]) || [6.5, 46.5];
// Screenshot runs capture further out (see ProjectMap.vue) so the landing-page
// billboard reads as a vignette beside the hero text.
const basemapZoom =
  (isPreviewMode ? project?.properties.previewZoom : undefined) ??
  project?.properties.zoom ??
  8;
const basemapPitch = project?.properties.pitch || 0;

// Arc data — set once after fetch
let arcs: FlowFeature[] = [];
let maxFlow = 1;

// Brush state — plain vars (not reactive) to avoid Vue overhead in the hot path
let brushLng = 0;
let brushLat = 0;
let brushCosLat = 1; // cos(brushLat) — precomputed to avoid per-arc trig
let brushActive = false;
let rafPending = false;

type FlowFeature = GeoJSON.Feature<
  GeoJSON.LineString,
  { flow: number; origin: number; dest: number }
>;

// Straight-line span of an arc in km, same equirectangular approximation.
function arcSpanKm(f: FlowFeature): number {
  const [sLng, sLat] = f.geometry.coordinates[0] as [number, number];
  const [tLng, tLat] = f.geometry.coordinates[1] as [number, number];
  const dLat = (tLat - sLat) * 111;
  const dLng = (tLng - sLng) * 111 * Math.cos((sLat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Equirectangular distance approximation — fast enough for ~10k arcs × 60fps
function isWithinBrush(lng: number, lat: number): boolean {
  const dLat = (lat - brushLat) * (Math.PI / 180);
  const dLon = (lng - brushLng) * (Math.PI / 180);
  return (
    6371000 * Math.sqrt(dLat * dLat + (dLon * brushCosLat) ** 2) <
    BRUSH_RADIUS_M
  );
}

function makeLayers() {
  return [
    new ArcLayer<FlowFeature>({
      id: `${props.projectId}-arcs`,
      data: arcs,
      getSourcePosition: (d) => d.geometry.coordinates[0] as [number, number],
      getTargetPosition: (d) => d.geometry.coordinates[1] as [number, number],
      getSourceColor: (d) => {
        if (isPreviewMode) return PREVIEW_ARC_SOURCE;
        if (!brushActive) return [200, 80, 220, 180];
        const [sLng, sLat] = d.geometry.coordinates[0] as [number, number];
        const [tLng, tLat] = d.geometry.coordinates[1] as [number, number];
        const near = isWithinBrush(sLng, sLat) || isWithinBrush(tLng, tLat);
        return near ? [220, 80, 255, 255] : [200, 80, 220, 18];
      },
      getTargetColor: (d) => {
        if (isPreviewMode) return PREVIEW_ARC_TARGET;
        if (!brushActive) return [80, 200, 255, 180];
        const [sLng, sLat] = d.geometry.coordinates[0] as [number, number];
        const [tLng, tLat] = d.geometry.coordinates[1] as [number, number];
        const near = isWithinBrush(sLng, sLat) || isWithinBrush(tLng, tLat);
        return near ? [80, 220, 255, 255] : [80, 200, 255, 18];
      },
      getWidth: (d) => Math.sqrt(d.properties!.flow / maxFlow) * 4,
      // These are intra-cantonal commutes a few km apart, and ArcLayer scales an
      // arc's bow to the span between its endpoints — at capture framing every
      // arc flattens into a speck. Lifting the height is what makes them read as
      // arcs at all; the width floor alone was not enough.
      getHeight: isPreviewMode ? 2 : 1,
      // Captures are framed far out, where the thinnest arcs fall below a pixel
      // and the preview reads as haze. Interactive maps keep the fine hairlines.
      widthMinPixels: isPreviewMode ? 2.6 : 0.5,
      // updateTriggers tell deck.gl when to re-run the color accessors
      updateTriggers: {
        getSourceColor: [brushLng, brushLat, brushActive],
        getTargetColor: [brushLng, brushLat, brushActive],
      },
    }),
  ];
}

function scheduleRedraw() {
  if (rafPending || !deckOverlay) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    deckOverlay?.setProps({ layers: makeLayers() });
  });
}

// Build-time screenshot: report the settled camera and signal the capture
// script. deck.gl draws the arcs on its own canvas after the map goes idle, so
// map events alone would fire too early — onAfterRender is the first moment a
// frame containing arcs actually exists. Guarded so it only ever fires once,
// and only with data on screen.
let previewSignalled = false;

function signalPreviewReady() {
  if (!isPreviewMode || previewSignalled || !map || arcs.length === 0) return;
  previewSignalled = true;
  window.__previewCamera = {
    center: map.getCenter().toArray() as [number, number],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  };
  window.__previewReady = true;
}

const loadFlows = async (url: string) => {
  const resp = await fetch(url);
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  arcs = geojson.features as FlowFeature[];

  // 60k hairline arcs average into haze at capture framing rather than reading
  // as flows, so captures keep only a few hundred. Rank them by flow x span,
  // NOT by flow alone: the busiest commutes are also the shortest (median
  // 1.4 km among the top 400 by volume), so ranking on volume picks arcs too
  // small to see. Weighting by distance surfaces the long inter-city corridors
  // (median 35 km) that actually read as arcs. The interactive map is
  // unaffected and still draws every flow.
  if (isPreviewMode && arcs.length > PREVIEW_ARC_COUNT) {
    arcs = [...arcs]
      .map((f) => ({ f, mass: f.properties!.flow * arcSpanKm(f) }))
      .sort((a, b) => b.mass - a.mass)
      .slice(0, PREVIEW_ARC_COUNT)
      .map(({ f }) => f);
  }

  maxFlow = Math.max(...arcs.map((f) => f.properties!.flow));

  if (!deckOverlay) {
    deckOverlay = new MapboxOverlay({
      interleaved: false,
      layers: makeLayers(),
      onAfterRender: signalPreviewReady,
    });
    map!.addControl(deckOverlay as unknown as maplibregl.IControl);
  } else {
    deckOverlay.setProps({ layers: makeLayers() });
  }
};

// When dataUrl changes (sub-viz switch), reload arcs without recreating the map
watch(flowUrl, (url) => {
  if (map) {
    loadFlows(url).catch((e) => console.error("Failed to load flows:", e));
  }
});

onMounted(() => {
  if (!mapContainer.value) return;

  try {
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
  } catch {
    // Already registered from Globe3D / another map mount
  }

  map = new maplibregl.Map({
    container: mapContainer.value,
    attributionControl: false,
    canvasContextAttributes: { alpha: true, premultipliedAlpha: true },
    style: {
      version: 8,
      // Match the live globe so the captured curvature and perspective line up
      // with the hover billboard (same trick as ProjectMap.vue).
      // Deliberately NOT globe, unlike ProjectMap. MapboxOverlay derives a Web
      // Mercator viewport from the map, so under MapLibre's globe projection
      // every arc collapses onto its source point and the capture reads as a
      // population scatter instead of flows (issue #18). CogRasterMap, the other
      // deck.gl renderer, is on mercator for the same reason. At preview zoom
      // over one canton the two projections are visually interchangeable.
      projection: undefined,
      sources: {},
      layers: [],
    },
    center: basemapCenter,
    zoom: basemapZoom,
    pitch: basemapPitch,
    refreshExpiredTiles: false,
    fadeDuration: 500,
    renderWorldCopies: false,
  });

  if (!isPreviewMode) {
    map.addControl(new maplibregl.NavigationControl(), "top-left");
  }

  map.on("load", () => {
    isLoading.value = false;
    loadFlows(flowUrl.value).catch((e) =>
      console.error("Failed to load flows:", e),
    );
  });

  // MapLibre's mousemove always fires, regardless of what's under the cursor —
  // this is more reliable than deck.gl's internal event tracking.
  map.on("mousemove", (e) => {
    brushLng = e.lngLat.lng;
    brushLat = e.lngLat.lat;
    brushCosLat = Math.cos(brushLat * (Math.PI / 180));
    brushActive = true;
    scheduleRedraw();
  });

  // Use the container's DOM mouseleave to detect when the cursor exits the map
  mapContainer.value.addEventListener("mouseleave", () => {
    brushActive = false;
    scheduleRedraw();
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
