<!--
  Description component for `hourly_adult_population`.
  Fake diurnal population curve showing how a DAVE-simulated tile shifts
  between night (low) and midday (peak) presence.
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

// Fake weekday diurnal curve: residents leave, workers arrive, lunch bump,
// afternoon plateau, evening decay.
const presence = [
  32, 28, 24, 22, 22, 28, 45, 70, 92, 100, 98, 94, 90, 94, 95, 90, 82, 70, 55,
  46, 40, 38, 35, 33,
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
      Hourly adult population on a 500 m² grid, produced by the <em>DAVE</em>
      activity-based simulation developed at
      <a href="https://www.epfl.ch/labs/urbes/" target="_blank" rel="noopener"
        >URBES</a
      >. Unlike a static census, the tiles shift through the day as synthetic
      agents move between home, workplace, school, and leisure.
    </p>
    <figure class="chart-figure">
      <v-chart :option="option" autoresize class="chart" />
      <figcaption>
        Reference weekday diurnal curve (demo data), expressed as a share of the
        midday peak.
      </figcaption>
    </figure>
    <p>
      Because the underlying model tracks who is where at each hour, the dataset
      feeds directly into heat-exposure and air-quality analyses that need to
      know the population actually present, not just where they sleep.
    </p>
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
