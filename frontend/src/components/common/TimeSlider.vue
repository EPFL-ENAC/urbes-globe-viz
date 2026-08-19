<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min: number;
    max: number;
    step?: number;
    label?: string;
    displayFormat?: "hour" | "number";
    autoplayIntervalMs?: number;
  }>(),
  {
    step: 1,
    label: "Time",
    displayFormat: "number",
    autoplayIntervalMs: 500,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const isPlaying = ref(false);
let timer: number | null = null;

const sliderValue = computed({
  get: () => props.modelValue,
  set: (value: number) => emit("update:modelValue", Number(value)),
});

const formatDisplayValue = (value: number) => {
  if (props.displayFormat === "hour") {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
  return `${value}`;
};

const stop = () => {
  isPlaying.value = false;
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
};

const play = () => {
  if (isPlaying.value) return;
  isPlaying.value = true;

  timer = window.setInterval(() => {
    const next = sliderValue.value + props.step;
    sliderValue.value = next > props.max ? props.min : next;
  }, props.autoplayIntervalMs);
};

const togglePlay = () => {
  if (isPlaying.value) {
    stop();
    return;
  }
  play();
};

watch(
  () => [props.min, props.max, props.step] as const,
  () => {
    if (sliderValue.value < props.min) sliderValue.value = props.min;
    if (sliderValue.value > props.max) sliderValue.value = props.max;
  },
  { immediate: true },
);

onUnmounted(stop);
</script>

<template>
  <div class="time-slider map-control">
    <div class="time-slider-header">
      <div class="map-micro-label">{{ label }}</div>
      <!-- The live value is the one emphasised element: ink, sans, medium. -->
      <div class="text-body2 slider-value text-weight-medium">
        {{ formatDisplayValue(sliderValue) }}
      </div>
    </div>

    <div class="time-slider-controls">
      <q-btn
        dense
        flat
        square
        size="sm"
        class="slider-btn"
        :icon="isPlaying ? 'pause' : 'play_arrow'"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        @click="togglePlay"
      />
      <span class="map-micro-label">{{ formatDisplayValue(min) }}</span>
      <q-slider
        v-model="sliderValue"
        :min="min"
        :max="max"
        :step="step"
        class="time-slider-input"
      />
      <span class="map-micro-label">{{ formatDisplayValue(max) }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Surface styling comes from the shared .map-control primitive in style.css. */
.time-slider {
  width: 100%;
  max-width: 100%;
  padding: 14px 16px;
}

.slider-value {
  color: var(--color-text);
}

/* Square bordered button, matching the .drawer-toggle / .nav-btn idiom.
   Circles are reserved for map markers (handoff §3). */
.slider-btn {
  width: 28px;
  height: 28px;
  min-height: 28px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-muted);
  transition: color 0.15s ease;
}

.slider-btn:hover {
  color: var(--color-text);
}

.time-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.time-slider-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-slider-input {
  flex: 1;
  min-width: 0;
  margin: 0;
}

/* Square the Quasar slider. The track ships a 4px radius and inner/selection
   inherit from it, so zeroing the track covers the whole bar. */
.time-slider-input :deep(.q-slider__track) {
  border-radius: 0;
}

/* The thumb is an <svg> circle (.q-slider__thumb-shape), not a CSS box, so it
   is hidden and the square drawn on the thumb element itself — which is
   already absolutely positioned and translate(-50%, -50%) centred on the
   value, so the square lands exactly where the circle did. */
.time-slider-input :deep(.q-slider__thumb-shape) {
  display: none;
}

.time-slider-input :deep(.q-slider__thumb) {
  width: 12px;
  height: 12px;
  background: var(--color-accent);
}

/* Kept (not hidden) so keyboard focus stays visible — just squared. */
.time-slider-input :deep(.q-slider__focus-ring) {
  border-radius: 0;
}
</style>
