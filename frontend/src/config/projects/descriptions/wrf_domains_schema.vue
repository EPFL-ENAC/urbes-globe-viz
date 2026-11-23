<!--
  Map of the three nested WRF domains, also a menu: a click on a domain opens
  its section (through the subVizNav injection of ProjectDetailView).
  Used by wrf_overview.vue (no highlight) and by wrf_d02/d03/d04.vue (the
  domain of the section is highlighted).

  Rectangles are to scale, from XLONG/XLAT of the wrfout files:
    d02  5.73 to 7.38 E, 45.93 to 46.98 N
    d03  6.43 to 6.79 E, 46.47 to 46.62 N (Lausanne)
    d04  5.98 to 6.32 E, 46.12 to 46.34 N (Geneva)
  Lon/lat to SVG: x = 10 + (lon - 5.732) * 170.6, y = 24 + (46.983 - lat) * 247.6
  (one degree of longitude is cos(46.5°) = 0.69 of a degree of latitude).
-->
<script setup lang="ts">
import { computed, inject } from "vue";
import { useChartTheme } from "@/utils/chart-theme";
import { subVizNavKey } from "@/utils/subVizNav";

type DomainId = "d02" | "d03" | "d04";

const props = defineProps<{ highlight?: DomainId }>();
const chartTheme = useChartTheme();
const nav = inject(subVizNavKey, undefined);

const accent = "#e4460a";

interface Domain {
  id: DomainId;
  name: string;
  rect: { x: number; y: number; width: number; height: number };
  // Click area: the rectangle plus its labels.
  hit: { x: number; y: number; width: number; height: number };
  title: { x: number; y: number };
  subtitle?: { x: number; y: number };
}

// d02 first: the children are drawn on top and catch their own clicks.
const domains: Domain[] = [
  {
    id: "d02",
    name: "Leman region, 1 km",
    rect: { x: 10, y: 24, width: 281, height: 260 },
    hit: { x: 6, y: 4, width: 289, height: 284 },
    title: { x: 12, y: 16 },
  },
  {
    id: "d03",
    name: "Lausanne, 333 m",
    rect: { x: 128, y: 114, width: 62, height: 37 },
    hit: { x: 124, y: 110, width: 156, height: 46 },
    title: { x: 196, y: 129 },
    subtitle: { x: 196, y: 143 },
  },
  {
    id: "d04",
    name: "Geneva, 333 m",
    rect: { x: 53, y: 184, width: 57, height: 55 },
    hit: { x: 49, y: 180, width: 140, height: 63 },
    title: { x: 116, y: 206 },
    subtitle: { x: 116, y: 220 },
  },
];

const styles = computed(() =>
  Object.fromEntries(
    domains.map((d) => {
      const on = d.id === props.highlight;
      return [
        d.id,
        on
          ? {
              fill: accent,
              fillOpacity: 0.12,
              stroke: accent,
              strokeOpacity: 1,
              strokeWidth: 2,
              title: 1,
              subtitle: 0.75,
            }
          : {
              fill: chartTheme.value.axis,
              fillOpacity: 0,
              stroke: chartTheme.value.axis,
              strokeOpacity: d.id === "d02" ? 0.7 : 0.55,
              strokeWidth: 1,
              title: 0.75,
              subtitle: 0.55,
            },
      ];
    }),
  ),
);

function open(d: Domain) {
  nav?.open(`wrf-${d.id}`);
}
</script>

<template>
  <svg
    viewBox="0 0 300 292"
    xmlns="http://www.w3.org/2000/svg"
    :role="nav ? 'group' : 'img'"
    aria-label="Map of the nested WRF domains"
    class="schema-svg"
    :class="{ 'is-menu': !!nav }"
    :style="{ color: chartTheme.axis }"
  >
    <g
      v-for="d in domains"
      :key="d.id"
      class="domain"
      :class="{ active: d.id === highlight }"
      :role="nav ? 'button' : undefined"
      :tabindex="nav ? 0 : undefined"
      :aria-label="nav ? `Open ${d.id}, ${d.name}` : undefined"
      :aria-current="nav && d.id === highlight ? 'true' : undefined"
      @click="open(d)"
      @keydown.enter.prevent="open(d)"
      @keydown.space.prevent="open(d)"
    >
      <rect v-bind="d.hit" class="hit" fill="transparent" />
      <rect
        v-bind="d.rect"
        class="frame"
        rx="3"
        :fill="styles[d.id]!.fill"
        :fill-opacity="styles[d.id]!.fillOpacity"
        :stroke="styles[d.id]!.stroke"
        :stroke-opacity="styles[d.id]!.strokeOpacity"
        :stroke-width="styles[d.id]!.strokeWidth"
      />
      <template v-if="d.subtitle">
        <text
          :x="d.title.x"
          :y="d.title.y"
          font-size="12"
          fill="currentColor"
          :fill-opacity="styles[d.id]!.title"
        >
          {{ d.id }}
        </text>
        <text
          :x="d.subtitle.x"
          :y="d.subtitle.y"
          font-size="10"
          fill="currentColor"
          :fill-opacity="styles[d.id]!.subtitle"
        >
          {{ d.name }}
        </text>
      </template>
      <text
        v-else
        :x="d.title.x"
        :y="d.title.y"
        font-size="11"
        fill="currentColor"
        :fill-opacity="styles[d.id]!.title"
      >
        {{ d.id }} - {{ d.name }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.schema-svg {
  width: 100%;
  height: auto;
  max-height: 300px;
  display: block;
}

.is-menu .domain {
  cursor: pointer;
  outline: none;
}

/* Hover and keyboard focus: show the frame at full strength. Only the
   hovered group reacts, the children sit on top of d02. */
.is-menu .domain:hover > .frame,
.is-menu .domain:focus-visible > .frame {
  stroke-opacity: 1;
  fill-opacity: 0.08;
}

.is-menu .domain.active:hover > .frame,
.is-menu .domain.active:focus-visible > .frame {
  fill-opacity: 0.2;
}

.is-menu .domain:focus-visible > .hit {
  stroke: currentColor;
  stroke-dasharray: 3 3;
  stroke-opacity: 0.6;
}
</style>
