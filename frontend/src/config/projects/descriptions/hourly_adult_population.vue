<!--
  Description component for `hourly_adult_population`.
  DAVE-simulated diurnal population curve for Lausanne central areas,
  expressed as a share of the midday peak.
-->
<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { useChartTheme } from "@/utils/chart-theme";

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
]);

const chartTheme = useChartTheme();

// Hour labels 00h - 23h
const hours = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}h`,
);

// DAVE-simulated weekday curve for Lausanne central areas, % of midday peak.
const presence = [
  42.0, 39.0, 37.9, 37.4, 37.5, 37.8, 42.1, 57.7, 75.9, 88.1, 93.6, 95.4, 100.0,
  97.9, 97.4, 97.0, 92.7, 83.0, 74.6, 67.3, 62.5, 56.9, 49.4, 41.5,
];

// Pulled from the hourly-population map palette (mid-high stop on the
// cyan → magenta ramp).
const lineColor = "#8000FF";

const option = computed(() => {
  const t = chartTheme.value;
  return {
    animation: false,
    grid: { top: 24, right: 16, bottom: 32, left: 40 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => `${v.toFixed(0)}%`,
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.tooltipText },
      extraCssText: "box-shadow: none;",
    },
    xAxis: {
      type: "category",
      data: hours,
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.axis, interval: 3 },
    },
    yAxis: {
      type: "value",
      name: "% of peak",
      nameTextStyle: { color: t.axis },
      axisLabel: { color: t.axis },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        data: presence,
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { color: lineColor, width: 2 },
      },
    ],
  };
});
</script>

<template>
  <div>
    <p>
      A census tells you where people live - but cities are actually alive.
      Mobility constantly reshapes population distribution. Exposure to heat and
      air pollution depends on where people actually are at different times. We
      use the <em>DAVE</em> activity-based model developed at
      <a href="https://www.epfl.ch/labs/urbes/" target="_blank" rel="noopener"
        >URBES</a
      >
      to simulate how population shifts continuously across the city as people
      commute, work, shop, and spend leisure time.
    </p>
    <figure class="chart-figure">
      <v-chart :option="option" autoresize class="chart" />
      <figcaption>Population dynamics in Lausanne central areas</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.chart-figure {
  margin: 1.5em 0;
}
.chart {
  width: 100%;
  height: 220px;
}
figcaption {
  margin-top: 0.4em;
  font-size: 0.8em;
  opacity: 0.6;
  text-align: center;
}
</style>
