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
  <div class="time-slider">
    <div class="time-slider-header">
      <div class="text-caption slider-muted">{{ label }}</div>
      <div class="text-body2 slider-value text-weight-medium">
        {{ formatDisplayValue(sliderValue) }}
      </div>
    </div>

    <div class="time-slider-controls">
      <q-btn
        dense
        flat
        round
        size="sm"
        class="slider-btn"
        :icon="isPlaying ? 'pause' : 'play_arrow'"
        @click="togglePlay"
      />
      <span class="slider-muted text-caption">{{
        formatDisplayValue(min)
      }}</span>
      <q-slider
        v-model="sliderValue"
        :min="min"
        :max="max"
        :step="step"
        class="time-slider-input"
      />
      <span class="slider-muted text-caption">{{
        formatDisplayValue(max)
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.time-slider {
  width: 100%;
  max-width: 100%;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  backdrop-filter: blur(4px);
}

.slider-value {
  color: var(--color-text);
}

.slider-muted {
  color: var(--color-text-muted);
}

.slider-btn {
  color: var(--color-text);
}

.time-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.time-slider-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-slider-input {
  flex: 1;
  margin: 0;
}
</style>
