<!--
  Description component for `buildings`.
  Fake histogram of Swiss building stock by construction decade - the
  kind of distribution researchers often reach for when linking urban form
  to thermal performance.
-->
<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { useChartTheme } from "@/utils/chart-theme";

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
]);

const chartTheme = useChartTheme();

// Representative year per decade, used to colour each bar with the same
// red → yellow → green ramp that the map applies to construction year
// (see buildings.ts paint.fill-extrusion-color: 1950 → #FF0000,
// 2000 → #FFFF00, 2020 → #00FF00).
const decades: Array<{ label: string; year: number }> = [
  { label: "<1850", year: 1840 },
  { label: "1850s", year: 1855 },
  { label: "1860s", year: 1865 },
  { label: "1870s", year: 1875 },
  { label: "1880s", year: 1885 },
  { label: "1890s", year: 1895 },
  { label: "1900s", year: 1905 },
  { label: "1910s", year: 1915 },
  { label: "1920s", year: 1925 },
  { label: "1930s", year: 1935 },
  { label: "1940s", year: 1945 },
  { label: "1950s", year: 1955 },
  { label: "1960s", year: 1965 },
  { label: "1970s", year: 1975 },
  { label: "1980s", year: 1985 },
  { label: "1990s", year: 1995 },
  { label: "2000s", year: 2005 },
  { label: "2010s", year: 2015 },
  { label: "2020s", year: 2025 },
];

// Fake share of the national stock: rise through the 20th century, peak in
// the postwar boom, plateau, mild recent uptick.
const counts = [
  42, 12, 15, 18, 22, 28, 35, 42, 48, 55, 60, 78, 96, 88, 72, 62, 68, 74, 28,
];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

function colorForYear(year: number): string {
  if (year <= 1950) return "#ff0000";
  if (year >= 2020) return "#00ff00";
  if (year <= 2000) {
    const t = (year - 1950) / 50;
    return hex(255, lerp(0, 255, t), 0);
  }
  const t = (year - 2000) / 20;
  return hex(lerp(255, 0, t), 255, 0);
}

const option = computed(() => {
  const t = chartTheme.value;
  return {
    animation: false,
    grid: { top: 24, right: 16, bottom: 40, left: 44 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => `${(v * 1000).toLocaleString()} buildings`,
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.tooltipText },
      extraCssText: "box-shadow: none;",
    },
    xAxis: {
      type: "category",
      data: decades.map((d) => d.label),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.axis, rotate: 45, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      name: "thousands",
      nameTextStyle: { color: t.axis },
      axisLabel: { color: t.axis },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        type: "bar",
        barWidth: "70%",
        data: decades.map((d, i) => ({
          value: counts[i],
          itemStyle: { color: colorForYear(d.year) },
        })),
      },
    ],
  };
});
</script>

<template>
  <div>
    <p>
      Swiss building footprints tagged with construction year, sourced from
      <a
        href="https://www.swisstopo.admin.ch/en/landscape-model-swisstlm3d"
        target="_blank"
        rel="noopener"
        >SwissTLM3D</a
      >. At <em>URBES</em> the dataset stands in for the morphological and
      thermal character of the built fabric: stock from different eras retains
      heat differently and shapes how each neighbourhood experiences the urban
      heat island.
    </p>
    <figure class="chart-figure">
      <v-chart :option="option" autoresize class="chart" />
      <figcaption>
        National stock by construction decade (demo data). The post-war peak
        dominates many Swiss neighbourhoods and drives much of today's retrofit
        agenda.
      </figcaption>
    </figure>
    <p>
      Pre-1950 stock dominates the historic centres and carries the highest
      thermal mass; the post-war peak above marks the generalisation of
      reinforced concrete; the late-century dip follows the slowdown after the
      1970s oil crises.
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
