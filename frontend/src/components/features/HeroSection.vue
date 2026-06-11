<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useProjectStore } from "@/stores/project";
import { useIsMobile } from "@/composables/useIsMobile";

// Each HeroSection renders its own text block. On desktop, CSS absolute-
// positions both parts into the same overlay slot and cross-fades them via
// the `is-active` class. On mobile the same markup flows inline so the
// intro sits above the project list and the outro below it.
const props = withDefaults(defineProps<{ part?: "intro" | "outro" }>(), {
  part: "intro",
});

const projectStore = useProjectStore();
const isMobile = useIsMobile();
const zoom = computed(() => projectStore.zoomLevel);
const initialZoom = computed(() => projectStore.initialZoom);
const isHoveringCard = computed(() => !!projectStore.hoveredProjectId);

// Hero text splits into two sequential panels. Two inputs advance through
// them independently:
//   (a) zooming the globe — can transition panel 0 → 1 → hidden
//   (b) wheeling over the hero text — toggles 0 ↔ 1 only; never dismisses
//
// The active panel is the max of both inputs' "progress", so the globe can
// still dismiss the hero even after a hero-scroll, but hero-scroll alone
// only pages between the two visible panels.
const PANEL_0_END = 0.25;
const PANEL_1_END = 1.25;

const heroPanelIndex = ref<0 | 1>(0);

const activePanel = computed(() => {
  if (isHoveringCard.value) return -1;
  const zoomProgress = zoom.value - initialZoom.value;
  const heroProgress = heroPanelIndex.value === 1 ? PANEL_0_END : 0;
  const p = Math.max(zoomProgress, heroProgress);
  if (p < PANEL_0_END) return 0;
  if (p < PANEL_1_END) return 1;
  return -1;
});

const heroVisible = computed(() => activePanel.value !== -1);
const isActive = computed(() =>
  props.part === "intro" ? activePanel.value === 0 : activePanel.value === 1,
);

watch(zoom, (z) => {
  if (z <= initialZoom.value + 0.001) heroPanelIndex.value = 0;
});

function onHeroWheel(e: WheelEvent) {
  // Mobile scrolls the page; desktop swallows the wheel and pages the hero.
  if (isMobile.value) return;
  e.preventDefault();
  e.stopPropagation();
  heroPanelIndex.value = e.deltaY > 0 ? 1 : 0;
}

function goToPanel(index: number) {
  heroPanelIndex.value = index === 1 ? 1 : 0;
  const base = projectStore.initialZoom;
  projectStore.requestZoom(index === 0 ? base : base + PANEL_0_END);
}
</script>

<template>
  <section class="hero-part" :class="`hero-part-${part}`">
    <div v-if="part === 'intro'" v-show="heroVisible" class="hero-dots">
      <div
        class="dot"
        :class="{ active: activePanel === 0 }"
        @click="goToPanel(0)"
      ></div>
      <div
        class="dot"
        :class="{ active: activePanel === 1 }"
        @click="goToPanel(1)"
      ></div>
    </div>

    <div
      class="hero-content"
      :class="{ 'is-active': isActive }"
      @wheel="onHeroWheel"
    >
      <h1 v-if="part === 'intro'" class="hero-title">
        Decoding the<br />physics of<br />cities
      </h1>
      <h1 v-else class="hero-title">Complexity<br />in time and<br />space</h1>

      <p v-if="part === 'intro'" class="hero-body">
        From the heartbeat of daily mobility to the temperature of their skin,
        cities are complex adaptive systems made of multiple interconnected
        components (e.g., demography, transport, energy). At URBES, a
        multidisciplinary research group at EPFL, we explore their dynamics
        across scales, quantify their interactions with the biosphere, and seek
        to uncover the fundamental laws that govern their behaviour.
      </p>
      <p v-else class="hero-body">
        URBES Globe brings our research to life through visualizations, open
        data, and model simulations - start exploring!
      </p>

      <div v-if="part === 'outro'" class="btn-row">
        <q-btn
          class="btn"
          href="https://www.epfl.ch/labs/urbes/"
          target="_blank"
          rel="noopener"
          unelevated
        >
          Visit Urbes Lab
        </q-btn>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-part {
  padding: 20px 20px 28px;
  color: var(--color-text);
}

.hero-title {
  font-weight: 300;
  font-size: clamp(2.5rem, 6vw, 3.75rem);
  line-height: 1.05;
  text-transform: uppercase;
  margin: 0 0 1rem;
}

.hero-body {
  font-family: "Nunito", sans-serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-muted);
  margin: 0;
}

.btn-row {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
}

.btn {
  padding: 0.65rem 1rem;
  background: #e30613;
  color: #ffffff;
  font-family: "Nunito", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
}

.hero-dots {
  display: none;
}

@media (min-width: 768px) {
  .hero-part {
    grid-row: 1;
    grid-column: 1;
    align-self: end;
    justify-self: start;
    width: 750px;
    max-width: 100%;
    padding: 1rem 2rem;
    pointer-events: none;
  }

  .hero-dots {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    pointer-events: auto;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-border-strong);
    transition: background 0.3s ease;
    cursor: pointer;
  }

  .dot.active {
    background: #e30613;
  }

  .hero-content {
    max-width: 550px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .hero-content.is-active {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
