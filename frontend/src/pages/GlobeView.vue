<script setup lang="ts">
import Globe3D from "@/components/features/Globe3D.vue";
import HeroSection from "@/components/features/HeroSection.vue";
import ProjectCard from "@/components/common/ProjectCard.vue";
import { projectsGeoJSON } from "@/config/projects";
import { useIsMobile } from "@/composables/useIsMobile";

// Flag drives Globe3D's backgroundMode prop; CSS handles the visible layout.
const isMobile = useIsMobile();
</script>

<template>
  <div class="globe-view-root">
    <div class="globe-layer">
      <Globe3D :background-mode="isMobile" />
    </div>
    <div class="foreground">
      <HeroSection />
      <div class="projects-wrap">
        <div class="projects-heading text-h6 text-weight-medium">Projects</div>
        <div class="projects-list">
          <ProjectCard
            v-for="feature in projectsGeoJSON.features"
            :key="feature.properties.id"
            :project="feature.properties"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.globe-view-root {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--color-map-bg);
  overflow: hidden;
}

.globe-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.foreground {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: grid;
  grid-template-rows: 1fr auto;
  pointer-events: none;
}

.projects-heading {
  display: none;
}

.projects-wrap {
  width: 100%;
  padding: 1rem var(--page-gutter);
  pointer-events: auto;
}

.projects-list {
  display: flex;
  flex-direction: row;
  /* Roomy enough that a long, wrapping card title doesn't crowd its neighbor. */
  gap: 56px;
  flex-wrap: nowrap;
  overflow-x: auto;
  justify-content: flex-start;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.projects-list::-webkit-scrollbar {
  display: none;
}

@media (max-width: 767px) {
  .globe-layer {
    position: fixed;
    pointer-events: none;
    filter: blur(1px) brightness(var(--globe-bg-brightness, 1.4));
    transform: scale(1.02);
  }

  /* Scrim so body text has baseline contrast without tinting the globe
     into invisibility. */
  .globe-layer::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in srgb, var(--color-bg) 18%, transparent) 35%,
      color-mix(in srgb, var(--color-bg) 28%, transparent) 100%
    );
    pointer-events: none;
  }

  .foreground {
    position: relative;
    inset: auto;
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    display: block;
    pointer-events: auto;
    /* Clear the fixed 60px NavigationBar so the hero title isn't cropped. */
    padding-top: 60px;
    padding-bottom: 32px;
  }

  .projects-heading {
    display: block;
    padding: 8px var(--page-gutter) 4px;
    color: var(--color-text);
  }

  .projects-wrap {
    padding: 0;
  }

  .projects-list {
    flex-direction: column;
    gap: 3rem;
    overflow-x: visible;
    padding: 8px var(--page-gutter) 28px;
    justify-content: flex-start;
  }
}

/* Compact desktop (narrow or short windows, e.g. heavy display scaling): same
   layout, smaller strip. The full-size strip is ~220px tall, which together
   with the hero no longer fits a 620px-tall viewport; 96px thumbnails and a
   smaller title bring it to ~200px (HeroSection.vue shrinks its type for the
   same reason). Cards stay a little wider than the thumbnail so the longest
   titles wrap to three lines, not four.
   Query mirrors COMPACT_LANDING_QUERY in composables/useIsMobile.ts. */
@media (min-width: 768px) and (max-width: 1280px),
  (min-width: 768px) and (max-height: 800px) {
  .projects-wrap {
    padding: 0.5rem var(--page-gutter) 0.75rem;
  }

  .projects-list {
    gap: 40px;
  }

  .projects-list :deep(.project-card) {
    width: 150px;
  }

  .projects-list :deep(.card-image) {
    width: 96px;
    height: 96px;
  }

  .projects-list :deep(.card-title) {
    font-size: 0.875rem;
  }
}
</style>
