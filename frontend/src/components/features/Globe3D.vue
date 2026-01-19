<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import {
  Deck,
  COORDINATE_SYSTEM,
  _GlobeView as GlobeView,
  FlyToInterpolator,
} from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry } from "@luma.gl/engine";
import { projectsGeoJSON } from "@/data/projects";
import { useProjectStore } from "@/stores/project";

const container = ref<HTMLDivElement | null>(null);
let deck: any = null;
let animationFrame: number | null = null;
let isUserInteracting = false;
let interactionTimeout: number | null = null;
let isHoveringProject = false;

const EARTH_RADIUS_METERS = 6.3e6;
const projectStore = useProjectStore();

// Watch for target coordinates changes and fly to location
watch(
  () => projectStore.targetCoordinates,
  (coords) => {
    if (coords && deck) {
      isHoveringProject = true;
      deck.setProps({
        initialViewState: {
          main: {
            longitude: coords.longitude,
            latitude: coords.latitude,
            zoom: 5,
            transitionDuration: 1000,
            transitionInterpolator: new FlyToInterpolator(),
          },
        },
      });
    } else {
      isHoveringProject = false;
    }
  },
);

onMounted(() => {
  if (!container.value) return;

  const initialViewState = {
    longitude: 8.2,
    latitude: 46.8,
    zoom: 3,
    minZoom: 2,
    maxZoom: 6,
  };

  const layers = [
    new SimpleMeshLayer({
      id: "earth-sphere",
      data: [0],
      mesh: new SphereGeometry({
        radius: EARTH_RADIUS_METERS,
        nlat: 18,
        nlong: 36,
      }),
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: [0, 0, 0],
      getColor: [0, 0, 0],
    }),
    new GeoJsonLayer({
      id: "earth-land",
      data: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_land.geojson",
      stroked: true,
      filled: true,
      opacity: 1,
      getFillColor: [80, 80, 80],
    }),
    new ScatterplotLayer({
      id: "projects",
      data: projectsGeoJSON.features,
      getPosition: (d: any) => d.geometry.coordinates,
      getFillColor: [200, 200, 200],
      getRadius: 50000,
      radiusMinPixels: 6,
      radiusMaxPixels: 20,
      pickable: true,
      onHover: (info: any) => {
        if (info.object) {
          container.value!.style.cursor = "pointer";
          projectStore.setHoveredProject(info.object.properties.id);
        } else {
          container.value!.style.cursor = "grab";
          projectStore.setHoveredProject(null);
        }
      },
      onClick: (info: any) => {
        if (info.object) {
          console.log("Project clicked:", info.object.properties);
        }
      },
    }),
  ];

  deck = new Deck({
    parent: container.value,
    initialViewState: {
      main: initialViewState,
    },
    controller: {
      inertia: 1000,
    },
    views: [new GlobeView({ id: "main" })],
    layers,
    onViewStateChange: ({ interactionState }: any) => {
      if (
        interactionState &&
        (interactionState.isDragging ||
          interactionState.isZooming ||
          interactionState.isPanning)
      ) {
        isUserInteracting = true;
        if (interactionTimeout) {
          clearTimeout(interactionTimeout);
        }
      }
    },
    onInteractionStateChange: ({ interactionState }: any) => {
      if (
        interactionState &&
        !interactionState.isDragging &&
        !interactionState.isZooming &&
        !interactionState.isPanning
      ) {
        if (interactionTimeout) {
          clearTimeout(interactionTimeout);
        }
        interactionTimeout = window.setTimeout(() => {
          isUserInteracting = false;
        }, 3000);
      }
    },
  });

  // Spin animation - only when not interacting and not hovering project
  const animate = () => {
    if (!isUserInteracting && !isHoveringProject && deck) {
      const viewState = deck.viewState.main;
      deck.setProps({
        initialViewState: {
          main: {
            ...viewState,
            longitude: viewState.longitude + 0.05,
          },
        },
      });
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
  if (deck) {
    deck.finalize();
    deck = null;
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
