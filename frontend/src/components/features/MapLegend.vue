<script setup lang="ts">
import type { ProjectLegend } from "@/config/projects/types";

defineProps<{ legend: ProjectLegend }>();
</script>

<template>
  <div class="map-legend">
    <div v-if="legend.title" class="legend-title">{{ legend.title }}</div>

    <!-- Discrete items -->
    <div v-if="legend.items?.length" class="legend-items">
      <div v-for="item in legend.items" :key="item.label" class="legend-item">
        <svg width="16" height="16" class="legend-swatch">
          <!-- line -->
          <line
            v-if="item.shape === 'line'"
            x1="0"
            y1="8"
            x2="16"
            y2="8"
            :stroke="item.color"
            stroke-width="2.5"
          />
          <!-- circle -->
          <circle
            v-else-if="item.shape === 'circle'"
            cx="8"
            cy="8"
            r="6"
            :fill="item.color"
          />
          <!-- square (default) -->
          <rect v-else x="1" y="1" width="14" height="14" :fill="item.color" />
        </svg>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- Gradient -->
    <div v-if="legend.gradient" class="legend-gradient-block">
      <div
        class="gradient-bar"
        :style="{
          background: `linear-gradient(to bottom, ${legend.gradient.stops.map((s) => s.color).join(', ')})`,
        }"
      />
      <div class="gradient-labels">
        <span
          v-for="stop in legend.gradient.stops"
          :key="stop.value"
          class="gradient-label"
          >{{ stop.value }}</span
        >
      </div>
      <div v-if="legend.gradient.unit" class="gradient-unit">
        {{ legend.gradient.unit }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-legend {
  position: relative;
  flex-shrink: 0;
  align-self: flex-end;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 12px 14px;
  min-width: 140px;
  max-width: 220px;
  z-index: 10;
  color: #fff;
  font-size: 11px;
  pointer-events: none;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  opacity: 0.9;
  text-transform: uppercase;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-swatch {
  flex-shrink: 0;
}

.legend-label {
  opacity: 0.85;
  line-height: 1.2;
}

.legend-gradient-block {
  display: flex;
  gap: 8px;
  align-items: stretch;
  margin-top: 4px;
}

.gradient-bar {
  width: 12px;
  min-height: 120px;
  border-radius: 3px;
  flex-shrink: 0;
}

.gradient-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.gradient-label {
  opacity: 0.85;
  line-height: 1.2;
}

.gradient-unit {
  position: absolute;
  bottom: 10px;
  right: 12px;
  opacity: 0.55;
  font-size: 10px;
}
</style>
