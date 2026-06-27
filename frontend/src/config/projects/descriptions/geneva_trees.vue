<!--
  Description component for `geneva_trees`.
  Shows trees in the Carouge commune, highlighting species distribution
  and the role of the urban canopy in mitigating urban heat islands.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
import { geodataBaseUrl as baseUrl } from "../../geodata";

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
]);

const chartTheme = useChartTheme();

// Holds the tree statistics calculated dynamically on mount
const speciesData = ref<any[]>([]);

onMounted(async () => {
  try {
    // 1. Fetch the raw GeoJSON dataset from public assets
    const res = await fetch(`${baseUrl}/geneva_trees.geojson`);
    const data = await res.json();

    // 2. Count the frequencies of each tree genus (extract first word of the full scientific name)
    const counts: Record<string, number> = {};
    for (const feature of data.features) {
      const name = feature.properties.NOM_COMPLE || "Other";
      const genus = name.split(" ")[0];
      counts[genus] = (counts[genus] || 0) + 1;
    }

    // 3. Compute percentage shares and sort descending
    const total = data.features.length;
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        value: Number(((count / total) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 13)
      .reverse(); // Reverse order for ECharts horizontal bar layout

    // Colors matching the styling in geneva_trees.ts
    const colorMap: Record<string, string> = {
      Betula: "#88d49e",
      Pinus: "#1b5e20",
      Picea: "#004b23",
      Acer: "#a3e635",
      Carpinus: "#38b000",
      Quercus: "#70e000",
      Platanus: "#ff9f1c",
      Populus: "#81c784",
      Tilia: "#2b9348",
      Aesculus: "#e9c46a",
      Fraxinus: "#52b788",
      Prunus: "#ff85a1",
      Fagus: "#e07a5f",
    };

    // Display names for chart labels
    const labelMap: Record<string, string> = {
      Betula: "Birch (Betula)",
      Pinus: "Pine (Pinus)",
      Picea: "Spruce (Picea)",
      Acer: "Maple (Acer)",
      Carpinus: "Hornbeam (Carpinus)",
      Quercus: "Oak (Quercus)",
      Platanus: "Plane (Platanus)",
      Populus: "Poplar (Populus)",
      Tilia: "Linden (Tilia)",
      Aesculus: "Chestnut (Aesculus)",
      Fraxinus: "Ash (Fraxinus)",
      Prunus: "Cherry/Plum (Prunus)",
      Fagus: "Beech (Fagus)",
    };

    // Populate reactive data array
    speciesData.value = sorted.map((item) => ({
      name: labelMap[item.name] || `${item.name} (Other)`,
      value: item.value,
      itemStyle: { color: colorMap[item.name] || "#90a4ae" },
    }));
  } catch (error) {
    console.error("Failed to load tree stats dynamically:", error);
  }
});

// Configure ECharts bar chart properties dynamically
const option = computed(() => {
  const t = chartTheme.value;
  return {
    animation: false,
    grid: { top: 16, right: 24, bottom: 32, left: 120 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: number) => `${v.toFixed(2)}%`,
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.tooltipText },
      extraCssText: "box-shadow: none;",
    },
    xAxis: {
      type: "value",
      name: "%",
      nameTextStyle: { color: t.axis },
      axisLabel: { color: t.axis },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    yAxis: {
      type: "category",
      data: speciesData.value.map((d) => d.name),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.axis, fontSize: 10 },
    },
    series: [
      {
        data: speciesData.value.map((d) => ({
          value: d.value,
          itemStyle: d.itemStyle,
        })),
        type: "bar",
        label: {
          show: true,
          position: "right",
          formatter: "{c}%",
          color: t.axis,
          fontSize: 10,
        },
      },
    ],
  };
});
</script>

<template>
  <div>
    <p>
      The urban forest canopy serves as a natural air conditioner for our
      cities. By shading streets, parking lots, and rooftops, trees prevent
      solar radiation from heating up hard surfaces. Simultaneously, through the
      process of <strong>evapotranspiration</strong>—where moisture absorbed by
      roots is released as vapor from leaves—trees actively cool the surrounding
      microclimate and buffer extreme summer heat.
    </p>

    <figure class="chart-figure">
      <v-chart :option="option" autoresize class="chart" />
      <figcaption>Share of dominant tree species in Carouge</figcaption>
    </figure>

    <p>
      <em>Processing and Bounding Box Note:</em> The original cantonal dataset
      contains over 238,000 isolated trees. To keep the interactive map fast and
      responsive in the browser, a spatial filter known as a
      <strong>Bounding Box (BBOX)</strong> was applied. A bounding box defines a
      rectangular geographical area using coordinate limits (minimum and maximum
      Easting and Northing). Using GDAL's <code>ogr2ogr</code> utility, the raw
      Shapefile was cropped to a 3km × 3km square covering the Carouge region
      using the Swiss Coordinate System limits (<code
        >-spat 2499000 1114000 2502000 1117000</code
      >). Simultaneously, the dataset was reprojected to WGS84
      (<code>EPSG:4326</code>) and stripped of unused attributes to produce a
      lightweight GeoJSON file of 18,824 points (3.3 MB).
    </p>
  </div>
</template>

<style scoped>
.chart-figure {
  margin: 1.5em 0;
}
.chart {
  width: 100%;
  height: 300px;
}
figcaption {
  margin-top: 0.4em;
  font-size: 0.8em;
  opacity: 0.6;
  text-align: center;
}
</style>
