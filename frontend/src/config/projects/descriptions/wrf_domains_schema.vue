<!--
  Shared schema used by wrf_d03.vue and wrf_d04.vue. Renders the three
  nested WRF domains and highlights whichever child was requested.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useChartTheme } from "@/utils/chart-theme";

const props = defineProps<{ highlight: "d03" | "d04" }>();
const chartTheme = useChartTheme();

const accent = "#e4460a";

function style(isHighlighted: boolean) {
  return isHighlighted
    ? {
        fill: accent,
        fillOpacity: 0.1,
        stroke: accent,
        strokeOpacity: 1,
        strokeWidth: 2,
        title: 1,
        subtitle: 0.7,
      }
    : {
        fill: "none",
        fillOpacity: 0,
        stroke: chartTheme.value.axis,
        strokeOpacity: 0.5,
        strokeWidth: 1,
        title: 0.55,
        subtitle: 0.45,
      };
}

const d03 = computed(() => style(props.highlight === "d03"));
const d04 = computed(() => style(props.highlight === "d04"));
</script>

<template>
  <svg
    viewBox="0 0 400 220"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Schema of nested WRF domains"
    class="schema-svg"
    :style="{ color: chartTheme.axis }"
  >
    <!-- d02 parent domain -->
    <rect
      x="20"
      y="35"
      width="360"
      height="160"
      fill="none"
      :stroke="chartTheme.axis"
      stroke-width="1"
      stroke-dasharray="4 4"
      rx="4"
    />
    <text x="28" y="28" font-size="11" fill="currentColor" fill-opacity="0.75">
      d02 - Leman region, 1 km
    </text>

    <!-- d03 child (Lausanne) -->
    <rect
      x="55"
      y="90"
      width="140"
      height="80"
      :fill="d03.fill"
      :fill-opacity="d03.fillOpacity"
      :stroke="d03.stroke"
      :stroke-opacity="d03.strokeOpacity"
      :stroke-width="d03.strokeWidth"
      rx="3"
    />
    <text
      x="125"
      y="135"
      font-size="12"
      fill="currentColor"
      :fill-opacity="d03.title"
      text-anchor="middle"
    >
      d03
    </text>
    <text
      x="125"
      y="152"
      font-size="10"
      fill="currentColor"
      :fill-opacity="d03.subtitle"
      text-anchor="middle"
    >
      Lausanne, 333 m
    </text>

    <!-- d04 sibling child (Geneva) -->
    <rect
      x="225"
      y="100"
      width="140"
      height="70"
      :fill="d04.fill"
      :fill-opacity="d04.fillOpacity"
      :stroke="d04.stroke"
      :stroke-opacity="d04.strokeOpacity"
      :stroke-width="d04.strokeWidth"
      rx="3"
    />
    <text
      x="295"
      y="132"
      font-size="12"
      fill="currentColor"
      :fill-opacity="d04.title"
      text-anchor="middle"
    >
      d04
    </text>
    <text
      x="295"
      y="148"
      font-size="10"
      fill="currentColor"
      :fill-opacity="d04.subtitle"
      text-anchor="middle"
    >
      Geneva, 333 m
    </text>
  </svg>
</template>

<style scoped>
.schema-svg {
  width: 100%;
  height: auto;
  max-height: 240px;
  display: block;
}
</style>
