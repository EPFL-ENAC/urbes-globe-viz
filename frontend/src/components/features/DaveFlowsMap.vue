<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { cogProtocol } from "@geomatico/maplibre-cog-protocol";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { projectsGeoJSON } from "@/data/projects";

const props = defineProps<{
  projectId: string;
}>();

const baseUrlOptions = {
  dev: "/geodata",
  prod: "https://enacit4r-cdn-s3.epfl.ch/urbes-viz",
};
const baseUrl = import.meta.env.DEV ? baseUrlOptions.dev : baseUrlOptions.prod;
const BRUSH_RADIUS_M = 8000;

const mapContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
let map: maplibregl.Map | null = null;
let deckOverlay: MapboxOverlay | null = null;

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
        if (!brushActive) return [200, 80, 220, 180];
        const [sLng, sLat] = d.geometry.coordinates[0];
        const [tLng, tLat] = d.geometry.coordinates[1];
        const near = isWithinBrush(sLng, sLat) || isWithinBrush(tLng, tLat);
        return near ? [220, 80, 255, 255] : [200, 80, 220, 18];
      },
      getTargetColor: (d) => {
        if (!brushActive) return [80, 200, 255, 180];
        const [sLng, sLat] = d.geometry.coordinates[0];
        const [tLng, tLat] = d.geometry.coordinates[1];
        const near = isWithinBrush(sLng, sLat) || isWithinBrush(tLng, tLat);
        return near ? [80, 220, 255, 255] : [80, 200, 255, 18];
      },
      getWidth: (d) => Math.sqrt(d.properties!.flow / maxFlow) * 4,
      widthMinPixels: 0.5,
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

const loadFlows = async () => {
  const resp = await fetch(`${baseUrl}/${props.projectId}.geojson`);
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  arcs = geojson.features as FlowFeature[];
  maxFlow = Math.max(...arcs.map((f) => f.properties!.flow));

  deckOverlay = new MapboxOverlay({
    interleaved: false,
    layers: makeLayers(),
  });
  map!.addControl(deckOverlay as unknown as maplibregl.IControl);
};

onMounted(() => {
  if (!mapContainer.value) return;

  try {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    maplibregl.addProtocol("cog", cogProtocol);
  } catch {
    // Already registered from Globe3D
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
      sources: {
        "ghsl-urban": {
          type: "raster",
          url: `cog://${baseUrl}/human_settlement_2025_cog.tif#color:BrewerGreys9,9,30,-`,
          tileSize: 256,
          maxzoom: 14,
        },
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: { "background-color": "#000000" },
        },
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
      ],
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
    loadFlows().catch((e) => console.error("Failed to load flows:", e));
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
