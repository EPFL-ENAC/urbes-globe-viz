<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const zoom = computed(() => projectStore.zoomLevel);
const isHoveringCard = computed(() => !!projectStore.hoveredProjectId);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const panel1Opacity = computed(() =>
  isHoveringCard.value ? 0 : clamp01(1 - (zoom.value - 2) / 0.4),
);
const panel2Opacity = computed(() =>
  isHoveringCard.value
    ? 0
    : Math.min(
        clamp01((zoom.value - 2.4) / 0.4),
        clamp01(1 - (zoom.value - 3.8)),
      ),
);
const heroVisible = computed(() => zoom.value < 4.8);
const activePanel = computed(() => (zoom.value < 2.4 ? 0 : 1));

function goToPanel(index: number) {
  projectStore.requestZoom(index === 0 ? 2 : 3.3);
}
</script>

<template>
  <div v-show="heroVisible" class="hero-overlay" style="z-index: 100">
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
        <!-- Panel 1: Hero — always rendered to hold the reference height -->
        <div
          class="hero-panel"
          :style="{ opacity: panel1Opacity }"
        >
          <h1 class="text-h2 text-weight-light q-mb-xs">
            DECODING THE<br />
            PHYSICS OF <br />
            CITIES
          </h1>
          <p class="text-body1 text-grey q-mt-lg">
            From the heartbeat of daily mobility to the temperature of their skin,
            cities are complex adaptive systems made of multiple interconnected
            components (e.g., demography, transport, energy). At URBES, a
            multidisciplinary research group at EPFL, we explore their dynamics
            across scales, quantify their interactions with the biosphere, and
            seek to uncover the fundamental laws that govern their behaviour.
          </p>
        </div>

        <!-- Panel 2: Info Sections -->
        <div
          v-show="panel2Opacity > 0"
          class="hero-panel"
          :style="{ opacity: panel2Opacity }"
        >
          <h1 class="text-h2 text-weight-light q-mb-xs">
            COMPLEXITY <br />
            IN TIME AND<br />
            SPACE
          </h1>
          <p class="text-body1 text-grey q-mt-lg">
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
  background: rgba(255, 255, 255, 0.3);
  transition: background 0.3s ease;
  cursor: pointer;
  pointer-events: auto;
}

.dot.active {
  background: #e30613;
}

.panels-container {
  display: grid;
}

.hero-panel {
  grid-area: 1 / 1;
  max-width: 550px;
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
</style>
