<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const zoom = computed(() => projectStore.zoomLevel);
const initialZoom = computed(() => projectStore.initialZoom);
const isHoveringCard = computed(() => !!projectStore.hoveredProjectId);
const isPreviewing = computed(() => projectStore.previewFlightActive);

// Single hero panel. On desktop it cross-fades out once the user zooms the
// globe in past this delta from the initial zoom. Dataset previews are framed
// far enough out to sit beside the text, so they deliberately do NOT dismiss
// it: the flag stays set through the return flight, whose zoom would otherwise
// cross the threshold on the way back and make the panel blink.
// On mobile the panel always shows (opacity rules are desktop-only) and flows
// inline above the project list.
const DISMISS_AT = 2.5;

const heroVisible = computed(() => {
  if (isHoveringCard.value || isPreviewing.value) return true;
  return zoom.value - initialZoom.value < DISMISS_AT;
});
</script>

<template>
  <section class="hero-part">
    <div class="hero-content" :class="{ 'is-visible': heroVisible }">
      <h1 class="hero-title">
        Complexity<br />in time<br />and <em>space</em>
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
        URBES Globe brings our research to life through visualizations, open
        data, and model simulations - start exploring!
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero-part {
  padding: 20px var(--page-gutter) 28px;
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

/* The single lab link in the body; it carries the only colour there. */
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
    padding: 1rem var(--page-gutter);
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

/* Compact desktop (narrow or short windows, e.g. heavy display scaling): the
   hero becomes a fixed-width left column, vertically centred, so the globe —
   padded to the right of it in Globe3D — and the projects column on the far
   right both stay clear of the text. The 440px here is what Globe3D reserves
   as left padding; keep the two in sync.
   Query mirrors COMPACT_LANDING_QUERY in composables/useIsMobile.ts. */
@media (min-width: 768px) and (max-width: 1280px),
  (min-width: 768px) and (max-height: 800px) {
  .hero-part {
    width: 440px;
    align-self: center;
    /* Top clears the fixed 60px NavigationBar even when centring runs
       the column up to the top of a very short viewport. */
    padding: 76px var(--page-gutter) 1rem;
  }

  .hero-title {
    font-size: clamp(2.5rem, 4vw, 3.25rem);
  }

  .hero-body {
    font-size: 0.9375rem;
  }
}
</style>
