<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const zoom = computed(() => projectStore.zoomLevel);
const initialZoom = computed(() => projectStore.initialZoom);
const isHoveringCard = computed(() => !!projectStore.hoveredProjectId);

// Single hero panel. On desktop it cross-fades out once the globe zooms in
// past this delta from the initial zoom, or while a project card is hovered.
// On mobile the panel always shows (opacity rules are desktop-only) and flows
// inline above the project list.
const DISMISS_AT = 2.5;

const heroVisible = computed(() => {
  if (isHoveringCard.value) return false;
  return zoom.value - initialZoom.value < DISMISS_AT;
});
</script>

<template>
  <section class="hero-part">
    <div class="hero-content" :class="{ 'is-visible': heroVisible }">
      <h1 class="hero-title">
        Decoding the<br />physics of<br /><em>cities</em>
      </h1>

      <p class="hero-body">
        From the heartbeat of daily mobility to the temperature of their skin,
        cities are complex adaptive systems made of multiple interconnected
        components (e.g., demography, transport, energy).
      </p>

      <p class="hero-body">
        At
        <a
          class="urbes-link"
          href="https://www.epfl.ch/labs/urbes/"
          target="_blank"
          rel="noopener"
          >URBES</a
        >, a multidisciplinary research group at EPFL, we explore their dynamics
        across scales, quantify their interactions with the biosphere, and seek
        to uncover the fundamental laws that govern their behaviour.
      </p>

      <p class="hero-body">
        <a
          class="urbes-link"
          href="https://www.epfl.ch/labs/urbes/"
          target="_blank"
          rel="noopener"
          >URBES</a
        >
        Globe brings our research to life through visualizations, open data, and
        model simulations - start exploring!
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero-part {
  padding: 20px 20px 28px;
  color: var(--color-text);
}

.hero-title {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: clamp(2.875rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: -0.025em;
  margin: 0 0 1rem;
}

/* The single emphasised word carries the only colour in the headline. */
.hero-title em {
  font-style: normal;
  color: var(--color-accent);
}

.hero-body {
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.55;
  /* Full-contrast body: white in dark mode, black in light mode. */
  color: var(--color-text);
  margin: 0;
}

/* Every "URBES" is the lab link; it carries the only colour in the body. */
.urbes-link {
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.15s ease-in-out;
}

.urbes-link:hover {
  color: var(--color-accent-strong);
  text-decoration: underline;
}

/* Equal spacing between every consecutive body paragraph. */
.hero-body + .hero-body {
  margin-top: 1rem;
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

  .hero-content {
    max-width: 550px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .hero-content.is-visible {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
