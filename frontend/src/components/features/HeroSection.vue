<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";

const props = withDefaults(defineProps<{ part?: "intro" | "outro" }>(), {
  part: "intro",
});

const projectStore = useProjectStore();
const zoom = computed(() => projectStore.zoomLevel);
const initialZoom = computed(() => projectStore.initialZoom);
const isHoveringCard = computed(() => !!projectStore.hoveredProjectId);

const HERO_END = 1.25;

const heroVisible = computed(() => {
  if (props.part !== "intro") return false;
  if (isHoveringCard.value) return false;

  const zoomProgress = zoom.value - initialZoom.value;
  return zoomProgress < HERO_END;
});
</script>

<template>
  <section v-if="props.part === 'intro'" class="hero-mobile">
    <h1 class="text-h3 text-weight-light q-mb-md hero-mobile-title">
      COMPLEXITY <br />IN TIME AND<br />SPACE
    </h1>

    <p class="text-body1 hero-body q-mb-lg">
      URBES Globe brings our research<br />
      to life through visualizations,<br />
      open data, and model simulations.<br />Start exploring!
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
    <div class="scroll-zone">
      <div class="hero-panel is-visible">
        <h1 class="text-h2 text-weight-light q-mb-xs">
          COMPLEXITY <br />
          IN TIME AND<br />
          SPACE
        </h1>

        <p class="text-body1 hero-body q-mt-lg">
          URBES Globe brings our research<br />
          to life through visualizations,<br />
          open data, and model simulations.<br />Start exploring!
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

.hero-panel {
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
