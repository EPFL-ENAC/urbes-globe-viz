<script setup lang="ts">
import { computed, ref } from "vue";
import { useThemeStore } from "@/stores/theme";
import { useIsMobile, useIsCompactProject } from "@/composables/useIsMobile";
import { useRoute, useRouter } from "vue-router";

const infoOpen = ref(false);
const themeStore = useThemeStore();
const isMobile = useIsMobile();
const isCompactProject = useIsCompactProject();
const route = useRoute();
const router = useRouter();

const themeIcon = computed(() =>
  themeStore.mode === "dark" ? "light_mode" : "dark_mode",
);
const themeLabel = computed(() =>
  themeStore.mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
);

const isProjectDetail = computed(() => route.path.startsWith("/project/"));
// On compact project detail the sheet header already shows the project
// title, so the bar drops logo/title for a back button instead.
const showBackButton = computed(
  () => isCompactProject.value && isProjectDetail.value,
);

const useGlass = computed(
  () => isMobile.value || (isCompactProject.value && isProjectDetail.value),
);

const goBack = () => {
  router.push("/");
};
</script>

<template>
  <div
    class="fixed-top nav-bar"
    :class="{ 'nav-bar-glass': useGlass }"
    style="height: 60px; z-index: 1000"
  >
    <div class="row items-center justify-between q-px-md" style="height: 100%">
      <div class="row items-center q-gutter-sm">
        <q-btn
          v-if="showBackButton"
          flat
          square
          icon="arrow_back"
          size="md"
          class="nav-btn"
          aria-label="Back to globe"
          @click="goBack"
        />
        <template v-else>
          <svg
            class="epfl-logo"
            viewBox="0 0 182.4 53"
            fill="currentColor"
            role="img"
            aria-label="EPFL"
          >
            <path d="M0,21.6H11.4V9.8H38.3V0H0Z" />
            <path d="M0,53H38.3V43.2H11.4V31.4H0Z" />
            <path d="M11.4,21.6H36V31.4H11.4Z" />
            <path
              d="M86,4.9c-1.5-1.5-3.4-2.6-5.7-3.5C78,0.4,75.1,0,71.8,0H48.1v53h11.4V31.4h12.2c3.3,0,6.1-0.4,8.5-1.3 c2.3-0.9,4.2-2.1,5.7-3.5c1.5-1.5,2.5-3.1,3.2-5s1-3.8,1-5.8s-0.3-4-1-5.8C88.5,8,87.4,6.3,86,4.9z M78,18.7 c-0.6,0.8-1.3,1.4-2.3,1.8c-0.9,0.4-2,0.7-3.3,0.9c-1.2,0.1-2.5,0.2-3.9,0.2h-9.1V9.8h9.1c1.3,0,2.6,0.1,3.9,0.2 c1.2,0.1,2.3,0.4,3.3,0.9c0.9,0.4,1.7,1,2.3,1.8c0.6,0.8,0.9,1.8,0.9,3S78.6,18,78,18.7z"
            />
            <path d="M155.5,43.2V0H144V53H182.4V43.2Z" />
            <path d="M97.4,21.6H108.9V9.8H135.8V0H97.4Z" />
            <path d="M97.4,31.4H108.8V53H97.4Z" />
            <path d="M108.9,21.6H133.5V31.4H108.9Z" />
          </svg>
          <q-separator vertical size="1px" class="nav-separator" />
          <span class="text-h6 text-weight-bold nav-title">URBES</span>
        </template>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-btn
          flat
          square
          :icon="themeIcon"
          :aria-label="themeLabel"
          size="md"
          class="nav-btn"
          @click="themeStore.toggle()"
        />

        <q-btn
          flat
          square
          icon="info"
          size="md"
          class="nav-btn"
          @click="infoOpen = true"
        />
      </div>
    </div>
  </div>

  <!-- Info side panel -->
  <teleport to="body">
    <!-- Backdrop -->
    <transition name="fade">
      <div v-if="infoOpen" class="info-backdrop" @click="infoOpen = false" />
    </transition>

    <!-- Panel -->
    <transition name="slide">
      <div v-if="infoOpen" class="info-panel">
        <q-btn
          flat
          square
          dense
          icon="close"
          class="close-btn nav-btn"
          @click="infoOpen = false"
        />

        <div class="panel-content">
          <h2 class="text-h6 q-mb-lg panel-heading">About Urbes Viz</h2>
          <p class="text-body1 panel-body q-mb-md">
            URBES Viz is an interactive visualization platform developed to
            explore and communicate research data from the
            <a
              href="https://www.epfl.ch/labs/urbes/"
              target="_blank"
              rel="noopener noreferrer"
              >URBES lab</a
            >. This demo showcases a 3D globe-based interface offering an
            immersive, multi-scale view of urban building energy research across
            geographic contexts worldwide.
          </p>
          <p class="text-body1 panel-body">
            Built on the design principles, data structures, and user experience
            insights developed through earlier iterations of URBES Viz, this
            application allows users to navigate research projects, datasets,
            and geographic coverage in an interactive global environment — from
            continental overviews down to city-scale detail.
          </p>

          <div class="section-divider" />

          <p class="text-h6 q-mb-xs panel-heading">How to cite</p>
          <p class="text-body1 panel-body">
            If you use data or visuals from this platform in your work, please
            cite it as follows: ... ?
          </p>

          <div class="section-divider" />

          <p class="text-h6 q-mb-xs panel-heading">Contributors</p>
          <p class="text-body1 panel-body">
            URBES Viz is developed at EPFL by
            <a
              href="https://www.epfl.ch/labs/urbes/"
              target="_blank"
              rel="noopener noreferrer"
              >URBES lab</a
            >, with technical implementation by
            <a
              href="https://www.epfl.ch/schools/enac/about/data-at-enac/enac-it4research/"
              target="_blank"
              rel="noopener noreferrer"
              >ENAC-IT4Research</a
            >'s research software engineers. Contact point: ... ?
          </p>

          <div class="section-divider" />

          <p class="text-h6 q-mb-xs panel-heading">Suggestions</p>
          <p class="text-body1 panel-body">
            Report bugs and suggestions directly on GitHub.
          </p>

          <div class="section-divider" />

          <p class="text-h6 q-mb-xs panel-heading">Basemap data</p>
          <p class="text-body1 panel-body">
            GHSL layer data provided by the
            <a
              href="https://emergency.copernicus.eu/"
              target="_blank"
              rel="noopener noreferrer"
              >Copernicus Emergency Management Service</a
            >.
          </p>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style>
.nav-bar {
  color: var(--color-text);
  pointer-events: none;
}

.nav-bar > .row > * {
  pointer-events: auto;
}

.nav-bar-glass {
  background: color-mix(in srgb, var(--color-bg) 55%, transparent);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  border-bottom: 1px solid var(--color-border);
  pointer-events: auto;
}

/* Inlined as real SVG so the fills (currentColor) follow the theme:
   black on light, white on dark. */
.epfl-logo {
  height: 16px;
  width: auto;
  display: block;
  color: var(--color-text);
}

.nav-title {
  color: var(--color-accent);
}

.nav-separator {
  background-color: var(--color-border-strong);
}

.nav-btn {
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  width: 40px;
  height: 40px;
}

.info-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1998;
}

.info-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  z-index: 1999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
  color: var(--color-text);
  border-left: 1px solid var(--color-border);
}

.panel-heading {
  color: var(--color-text);
}

.panel-body {
  color: var(--color-text-muted);
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 32px;
  z-index: 1;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 80px 12% 40px 12%;
  scrollbar-width: none;
}

.panel-content a {
  color: var(--color-text);
  text-decoration: underline;
}

.panel-content a:hover {
  color: var(--color-text);
  text-decoration: underline;
}

.panel-content::-webkit-scrollbar {
  display: none;
}

.section-divider {
  height: 1px;
  background: var(--color-border);
  margin: 28px 0;
}

/* Slide from right */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Backdrop fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile: full width */
@media (max-width: 768px) {
  .info-panel {
    width: 100vw;
  }
}
</style>
