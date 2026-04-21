<script setup lang="ts">
import { ref } from "vue";
import type { Map, PaddingOptions } from "maplibre-gl";
import {
  useGhslBasemap,
  type GhslBasemapOptions,
} from "@/composables/useGhslBasemap";

const props = defineProps<{
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  minZoom?: number;
  maxZoom?: number;
  projection?: "globe" | "mercator";
  /** Must match the overlay map's padding to keep the two canvases aligned. */
  padding?: Partial<PaddingOptions>;
}>();

const container = ref<HTMLDivElement | null>(null);

const options: GhslBasemapOptions = {
  center: props.center,
  zoom: props.zoom,
  pitch: props.pitch,
  bearing: props.bearing,
  minZoom: props.minZoom,
  maxZoom: props.maxZoom,
  projection: props.projection,
  padding: props.padding,
};

const { map, ready, syncFrom } = useGhslBasemap(container, options);

defineExpose({
  map,
  ready,
  syncFrom: (other: Map) => syncFrom(other),
});
</script>

<template>
  <div ref="container" class="ghsl-basemap-canvas"></div>
</template>

<style scoped>
.ghsl-basemap-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
