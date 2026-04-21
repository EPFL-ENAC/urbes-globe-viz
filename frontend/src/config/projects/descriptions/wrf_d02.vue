<!--
  Example `descriptionComponent` for a project/subViz.

  Convention: custom description components live in
  `src/config/projects/descriptions/`, one file per project or subViz,
  named to match the config id (e.g. `wrf_d02.vue`).

  Wire it up from the config:
    descriptionComponent: () => import("./descriptions/wrf_d02.vue")

  Mix prose and a chart here the same way you would in any Vue SFC. The root
  element inherits the drawer's body styling (text-body1 + line-height) via
  attribute fallthrough, so keep it single-root.

  The data below is FAKE - replace with real values from your project.
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

// Fake diurnal 2m-temperature cycle over 24 hours (peak ~14h, min ~02h).
const hours = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}h`,
);
const temperatures = hours.map((_, i) => {
  const rad = ((i - 14) / 24) * 2 * Math.PI;
  return Number((24 + 6 * Math.cos(rad)).toFixed(1));
});

// Pulled from the WRF d02 temperature map palette (the middle-hot stop).
const lineColor = "#e4460a";

const option = computed(() => {
  const t = chartTheme.value;
  return {
    animation: false,
    grid: { top: 24, right: 16, bottom: 32, left: 40 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => `${v.toFixed(1)} °C`,
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
      name: "°C",
      nameTextStyle: { color: t.axis },
      axisLabel: { color: t.axis },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        data: temperatures,
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
      Mesoscale WRF simulation at 1 km across the Leman basin. At this grid lake
      breezes and valley circulations are resolved alongside the broader urban
      footprint of Lausanne and Geneva.
    </p>
    <figure class="chart-figure">
      <v-chart :option="option" autoresize class="chart" />
      <figcaption>Fake 2m temperature, 24h cycle (demo data).</figcaption>
    </figure>
    <p>
      The curve above sketches the diurnal cycle of near-surface temperature:
      rapid warming through the morning, a mid-afternoon peak, then a slow
      cooling as the urban fabric releases the day's heat.
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
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  background: rgba(128, 128, 128, 0.15);
  border-radius: 3px;
}
</style>
