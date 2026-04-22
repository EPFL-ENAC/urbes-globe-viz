<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";

// On mobile the two hero paragraphs sit either side of the project list.
// `outro` instances skip the desktop zoom-driven overlay so only `intro`
// renders it.
const props = withDefaults(defineProps<{ part?: "intro" | "outro" }>(), {
  part: "intro",
});

const projectStore = useProjectStore();
const zoom = computed(() => projectStore.zoomLevel);
const initialZoom = computed(() => projectStore.initialZoom);
const isHoveringCard = computed(() => !!projectStore.hoveredProjectId);

// Hero text splits into two sequential panels as the user zooms in.
// Ranges are relative to initialZoom so behavior scales across screen sizes:
//   [base,      base + 3) → panel 0
//   [base + 3,  base + 6) → panel 1
//   [base + 6, ∞)         → hidden
const PART_SPAN = 2;

const activePanel = computed(() => {
  if (isHoveringCard.value) return -1;
  const z = zoom.value;
  const base = initialZoom.value;
  if (z < base + PART_SPAN) return 0;
  if (z < base + PART_SPAN * 2) return 1;
  return -1;
});

const heroVisible = computed(() => activePanel.value !== -1);

function goToPanel(index: number) {
  const base = projectStore.initialZoom;
  projectStore.requestZoom(index === 0 ? base : base + PART_SPAN);
}
</script>

<template>
  <section v-if="props.part === 'intro'" class="hero-mobile">
    <h1 class="text-h3 text-weight-light q-mb-md hero-mobile-title">
      DECODING THE<br />PHYSICS OF <br />CITIES
    </h1>
    <p class="text-body1 hero-body">
      From the heartbeat of daily mobility to the temperature of their skin,
      cities are complex adaptive systems made of multiple interconnected
      components (e.g., demography, transport, energy). At URBES, a
      multidisciplinary research group at EPFL, we explore their dynamics across
      scales, quantify their interactions with the biosphere, and seek to
      uncover the fundamental laws that govern their behaviour.
    </p>
  </section>

  <section v-else class="hero-mobile">
    <h1 class="text-h3 text-weight-light q-mb-md hero-mobile-title">
      COMPLEXITY <br />IN TIME AND<br />SPACE
    </h1>
    <p class="text-body1 hero-body q-mb-lg">
      URBES Globe brings our research to life through visualizations, open data,
      and model simulations - start exploring!
    </p>
    <div class="btn-row">
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
  </section>

  <div
    v-if="props.part === 'intro'"
    v-show="heroVisible"
    class="hero-overlay"
    style="z-index: 100"
  >
    <!-- Panel zone -->
    <div class="scroll-zone">
      <!-- Dot indicators — above the panels -->
      <div class="dot-indicators">
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

      <!-- Panels: stacked in same grid cell so only the visible one sets height -->
      <div class="panels-container">
        <div class="hero-panel" :class="{ 'is-visible': activePanel === 0 }">
          <h1 class="text-h2 text-weight-light q-mb-xs">
            DECODING THE<br />
            PHYSICS OF <br />
            CITIES
          </h1>
          <p class="text-body1 hero-body q-mt-lg">
            From the heartbeat of daily mobility to the temperature of their
            skin, cities are complex adaptive systems made of multiple
            interconnected components (e.g., demography, transport, energy). At
            URBES, a multidisciplinary research group at EPFL, we explore their
            dynamics across scales, quantify their interactions with the
            biosphere, and seek to uncover the fundamental laws that govern
            their behaviour.
          </p>
        </div>

        <div class="hero-panel" :class="{ 'is-visible': activePanel === 1 }">
          <h1 class="text-h2 text-weight-light q-mb-xs">
            COMPLEXITY <br />
            IN TIME AND<br />
            SPACE
          </h1>
          <p class="text-body1 hero-body q-mt-lg">
            URBES Globe brings our research to life through visualizations, open
            data, and model simulations - start exploring!
          </p>
          <div class="btn-row q-pt-md">
            <q-btn
              class="btn"
              href="https://www.epfl.ch/labs/urbes/"
              target="_blank"
              rel="noopener"
            >
              Visit Urbes Lab
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-overlay {
  width: 100%;
  pointer-events: none;
}

.scroll-zone {
  width: 750px;
  padding: 1rem 2rem;
  pointer-events: none;
}

.dot-indicators {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border-strong);
  transition: background 0.3s ease;
  cursor: pointer;
  pointer-events: auto;
}

.dot.active {
  background: #e30613; /* EPFL brand red — intentional across themes */
}

.panels-container {
  display: grid;
}

.hero-panel {
  grid-area: 1 / 1;
  max-width: 550px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.hero-panel.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.btn-row {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.65rem 1rem;
  background: #e30613;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  pointer-events: auto;
}

.hero-body {
  color: var(--color-text-muted);
}

.hero-mobile {
  display: none;
}

.hero-mobile-title {
  color: var(--color-text);
  line-height: 1.05;
}

@media (max-width: 767px) {
  .hero-overlay {
    display: none;
  }

  .hero-mobile {
    display: block;
    padding: 20px 20px 28px;
    color: var(--color-text);
  }
}
</style>
