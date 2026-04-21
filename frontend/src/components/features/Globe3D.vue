<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { pmtilesProtocol } from "@/lib/pmtilesClient";
import { projectsGeoJSON } from "@/config/projects";
import { useProjectStore } from "@/stores/project";
import { useRouter } from "vue-router";
import { useMapPreview } from "@/composables/useMapPreview";
import GhslBasemap from "@/components/features/GhslBasemap.vue";

const container = ref<HTMLDivElement | null>(null);
const basemapRef = ref<InstanceType<typeof GhslBasemap> | null>(null);
const isLoading = ref(true);
const projectStore = useProjectStore();
const router = useRouter();
const preview = useMapPreview();

let map: maplibregl.Map | null = null;
let animationFrame: number | null = null;
let spinRunning = false;
let spinKilled = false; // set on first explicit user gesture (pointerdown/wheel)
let resettingToOverview = false; // true while the scroll-back restore flyTo is in flight
let flying = false; // true during any programmatic flyTo — disables the min-zoom clamp so the flight arc isn't interrupted
let pmtilesRegistered = false;
let markersSetupStarted = false;
let unsubscribeBasemapSync: (() => void) | null = null;

// Initial zoom scales with viewport width so the globe reads correctly on
// phones and fills large monitors: smaller screens need a tighter globe.
function computeInitialZoom(): number {
  const w = window.innerWidth;
  if (w >= 2560) return 4; // extra-large monitor / 4K+
  if (w >= 1280) return 3; // large monitor (FHD, QHD)
  return 2; // laptop
}

const initialCamera = {
  center: [6.3, 46.2] as [number, number],
  zoom: computeInitialZoom(),
  // Captured from the live map on first load (see map.on("load")) so the
  // restore-overview flyTo lands on the exact camera the user saw initially
  // — globe projection may apply its own defaults we don't want to hardcode.
  pitch: 0,
  bearing: 0,
};

// Hover preview sits this many zoom levels below the project's full-view zoom
// so users see context around the marker, not a tight deep-zoom.
const PREVIEW_ZOOM_OFFSET = 3;

// --- Idle spin (speed decreases with zoom, stops at zoom ≥ 10) ---
// Pauses during hover preview, resumes after the restore flyTo completes.
// Permanently killed on the first user drag/wheel gesture.

function spinLoop() {
  if (!spinRunning || spinKilled || !map) {
    animationFrame = null;
    return;
  }
  const zoom = map.getZoom();
  if (zoom < 10) {
    const speed = 0.05 * (1 - zoom / 10);
    const c = map.getCenter();
    map.setCenter([c.lng + speed, c.lat]);
  }
  animationFrame = requestAnimationFrame(spinLoop);
}

function resumeSpin() {
  if (spinKilled || spinRunning || !map) return;
  spinRunning = true;
  animationFrame = requestAnimationFrame(spinLoop);
}

function pauseSpin() {
  spinRunning = false;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function killSpin() {
  spinKilled = true;
  pauseSpin();
}

function armKillSpinListeners() {
  if (!map) return;
  const canvas = map.getCanvas();
  canvas.addEventListener("pointerdown", killSpin, { once: true });
  canvas.addEventListener("wheel", killSpin, { once: true });
}

// When the user scrolls back out to the initial zoom after panning/zooming,
// fly to the original overview and re-arm the idle spin.
function restoreOverview() {
  if (!map || resettingToOverview) return;
  resettingToOverview = true;
  flying = true;
  map.flyTo({
    center: initialCamera.center,
    zoom: initialCamera.zoom,
    pitch: initialCamera.pitch,
    bearing: initialCamera.bearing,
    duration: 1200,
  });
  map.once("moveend", () => {
    resettingToOverview = false;
    flying = false;
    spinKilled = false;
    armKillSpinListeners();
    resumeSpin();
  });
}

// --- Hover watcher: single source of truth ---

watch(
  () => projectStore.hoveredProjectId,
  (projectId) => {
    if (!map) return;

    map.stop();
    preview.remove(map);
    preview.filterCircles(map, projectId);

    if (projectId) {
      pauseSpin();

      const feature = projectsGeoJSON.features.find(
        (f) => f.properties.id === projectId,
      );
      if (!feature) return;
      const [lng, lat] = feature.geometry.coordinates;
      if (lng != null && lat != null) {
        const featureZoom = feature.properties.zoom || 8;
        const previewZoom = Math.max(
          initialCamera.zoom,
          feature.properties.previewZoom ?? featureZoom - PREVIEW_ZOOM_OFFSET,
        );
        flying = true;
        map.flyTo({
          center: [lng, lat],
          zoom: previewZoom,
          pitch: feature.properties.pitch || 0,
          duration: 1200,
        });
        map.once("moveend", () => {
          flying = false;
        });
      }
      preview.add(map, projectId);
    } else {
      // On unhover, zoom back out but stay at the current longitude so the
      // camera doesn't jump away from where the user was just looking.
      const currentLng = map.getCenter().lng;
      flying = true;
      map.flyTo({
        center: [currentLng, initialCamera.center[1]],
        zoom: initialCamera.zoom,
        pitch: initialCamera.pitch,
        bearing: initialCamera.bearing,
        duration: 1200,
      });
      map.once("moveend", () => {
        flying = false;
        resumeSpin();
      });
    }
  },
);

// --- Map setup ---

onMounted(() => {
  if (!container.value) return;

  // Pinia survives route changes; stale hover/zoom hid the hero.
  projectStore.setHoveredProject(null);
  projectStore.setZoomLevel(initialCamera.zoom);
  projectStore.setInitialZoom(initialCamera.zoom);

  if (!pmtilesRegistered) {
    try {
      maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
    } catch {
      // GhslBasemap registered it first — fine.
    }
    pmtilesRegistered = true;
  }

  map = new maplibregl.Map({
    container: container.value,
    center: initialCamera.center,
    zoom: initialCamera.zoom,
    minZoom: initialCamera.zoom,
    maxZoom: 15,
    attributionControl: false,
    fadeDuration: 500,
    // Transparent overlay — no background layer, relies on the GhslBasemap
    // sibling beneath us for visible pixels outside the project markers.
    canvasContextAttributes: { alpha: true, premultipliedAlpha: true },
    style: {
      version: 8,
      projection: { type: "globe" },
      sources: {},
      layers: [],
    },
  });

  map.setPadding({ top: 0, right: 0, bottom: 72, left: 0 });
  projectStore.setZoomLevel(2);

  // Any explicit user gesture (drag or wheel) permanently kills the idle spin
  // until the user scrolls back out to the initial zoom (see zoomend handler).
  armKillSpinListeners();

  // Block scroll-out wheel events when already at the zoom floor. Otherwise
  // MapLibre's scroll-zoom handler still runs its "zoom around cursor" math,
  // which shifts the center even when the zoom itself is clamped — giving
  // the impression of panning the globe by scrolling at min zoom.
  map.getCanvas().addEventListener(
    "wheel",
    (e) => {
      if (!map) return;
      if (e.deltaY > 0 && map.getZoom() <= initialCamera.zoom) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true, passive: false },
  );

  // Sync camera from overlay → basemap. Attach once the basemap is created
  // (its `ready` ref flips after the instance mounts; `syncFrom` is safe
  // to call immediately because it only registers event listeners).
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

  // Project markers
  const setupMarkers = async () => {
    if (!map || markersSetupStarted) return;
    markersSetupStarted = true;

    await preview.setupIcons(map);

    map.addSource("projects", { type: "geojson", data: projectsGeoJSON });
    map.addLayer({
      id: "project-circles",
      type: "symbol",
      source: "projects",
      layout: {
        "icon-image": ["concat", ["get", "id"], "-marker"],
        "icon-size": 1,
        "icon-allow-overlap": true,
      },
    });

    map.on("mouseenter", "project-circles", () => {
      map!.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "project-circles", () => {
      map!.getCanvas().style.cursor = "grab";
    });
    map.on("click", "project-circles", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) router.push(`/project/${id}`);
    });
  };

  let initialPoseCaptured = false;
  const captureInitialPose = () => {
    if (!map || initialPoseCaptured) return;
    initialPoseCaptured = true;
    initialCamera.pitch = map.getPitch();
    initialCamera.bearing = map.getBearing();
  };

  map.once("render", () => {
    isLoading.value = false;
    captureInitialPose();
    setupMarkers();
  });
  map.on("load", () => {
    isLoading.value = false;
    captureInitialPose();
    setupMarkers();
  });

  resumeSpin();
  // Track zoom level in store, and enforce minZoom manually — MapLibre's
  // globe projection doesn't reliably clamp scroll-zoom at the configured
  // minZoom, so we snap back here whenever zoom dips below the initial.
  map.on("zoom", () => {
    if (!map) return;
    const z = map.getZoom();
    // Don't clamp while a programmatic flyTo is running — its arc trajectory
    // legitimately dips below initialCamera.zoom and the clamp would interrupt it.
    if (!flying && z < initialCamera.zoom) {
      map.setZoom(initialCamera.zoom);
      return;
    }
    projectStore.setZoomLevel(z);
  });
  // Scrolling back out to the initial zoom snaps to the original overview
  // and resumes the idle spin — "go back to where I started".
  map.on("zoomend", () => {
    if (
      map &&
      spinKilled &&
      !resettingToOverview &&
      map.getZoom() <= initialCamera.zoom
    ) {
      restoreOverview();
    }
  });
});

// React to zoom requests from other components (e.g. HeroSection dot nav)
watch(
  () => projectStore.targetZoom,
  (zoom) => {
    if (zoom == null || !map) return;
    map.easeTo({ zoom, duration: 600 });
    projectStore.targetZoom = null;
  },
);

onUnmounted(() => {
  pauseSpin();
  if (unsubscribeBasemapSync) {
    unsubscribeBasemapSync();
    unsubscribeBasemapSync = null;
  }
  if (map) preview.remove(map);
  if (map) {
    map.remove();
    map = null;
  }
  markersSetupStarted = false;
});
</script>

<template>
  <div class="globe-wrapper">
    <GhslBasemap
      ref="basemapRef"
      :center="initialCamera.center"
      :zoom="initialCamera.zoom"
      :min-zoom="initialCamera.zoom"
      :max-zoom="15"
      projection="globe"
      :padding="{ top: 0, right: 0, bottom: 72, left: 0 }"
    />
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
  background: var(--color-map-bg);
}

.globe-container {
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
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-border);
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
