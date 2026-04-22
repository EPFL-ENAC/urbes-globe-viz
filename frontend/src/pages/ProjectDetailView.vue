<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import ProjectMap from "@/components/features/ProjectMap.vue";
import DaveFlowsMap from "@/components/features/DaveFlowsMap.vue";
import CogRasterMap from "@/components/features/CogRasterMap.vue";
import MapLegend from "@/components/features/MapLegend.vue";
import TimeSlider from "@/components/common/TimeSlider.vue";
import VariableSelector from "@/components/common/VariableSelector.vue";
import { allProjects, projectsGeoJSON } from "@/config/projects";
import { renderDescription } from "@/utils/markdown";
import { DEFAULT_TITLE } from "@/router";
import { useIsCompactProject } from "@/composables/useIsMobile";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import type { Component } from "vue";

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;
const drawerOpen = ref(true);
const isMobile = useIsCompactProject();
const sheetOpen = ref(true);

const project = computed(() => {
  const feature = projectsGeoJSON.features.find(
    (f) => f.properties.id === projectId,
  );
  return feature?.properties;
});

watch(
  () => project.value?.title,
  (title) => {
    document.title = title ? `${title} - URBES` : DEFAULT_TITLE;
  },
  { immediate: true },
);

const projectConfig = computed(() =>
  allProjects.find((p) => p.id === projectId),
);

const subVizList = computed(() => projectConfig.value?.subViz);

const activeSubVizIndex = ref(0);

const activeRenderer = computed(() => {
  if (subVizList.value) {
    return subVizList.value[activeSubVizIndex.value]?.renderer;
  }
  return project.value?.renderer;
});

const activeDataUrl = computed(() => {
  if (subVizList.value) {
    return subVizList.value[activeSubVizIndex.value]?.dataUrl;
  }
  return undefined;
});

const activeCenter = computed(() => {
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.coordinates ??
      projectConfig.value?.coordinates
    );
  }
  return projectConfig.value?.coordinates;
});

const activeZoom = computed(() => {
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.zoom ??
      projectConfig.value?.zoom
    );
  }
  return projectConfig.value?.zoom;
});

// COG variable selector — cascades subViz → project-level
const activeCogVariables = computed(() => {
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.cogVariables ??
      projectConfig.value?.cogVariables
    );
  }
  return projectConfig.value?.cogVariables;
});

const activeVariableId = ref<string>("");

// Reset variable selection when subViz or variable list changes
watch(
  activeCogVariables,
  (vars) => {
    if (vars?.length) {
      activeVariableId.value = vars[0]!.id;
    } else {
      activeVariableId.value = "";
    }
  },
  { immediate: true },
);

const activeCogVariable = computed(() => {
  const vars = activeCogVariables.value;
  if (!vars?.length) return undefined;
  return vars.find((v) => v.id === activeVariableId.value) ?? vars[0];
});

// When cogVariables is present, the selected variable overrides cogRaster and legend
const activeCogRaster = computed(() => {
  if (activeCogVariable.value) return activeCogVariable.value.cogRaster;
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.cogRaster ??
      projectConfig.value?.cogRaster
    );
  }
  return projectConfig.value?.cogRaster;
});

const activeLegend = computed(() => {
  if (activeCogVariable.value?.legend) return activeCogVariable.value.legend;
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.legend ??
      projectConfig.value?.legend
    );
  }
  return projectConfig.value?.legend;
});

const activeTimeControl = computed(() => {
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.timeControl ??
      projectConfig.value?.timeControl
    );
  }
  return projectConfig.value?.timeControl;
});

// Resolve async description components once per config change, keyed by viz.id
// for subViz and stored solo for the project-level single-viz layout.
const subVizDescriptionComponents = computed(() => {
  const map = new Map<string, Component>();
  subVizList.value?.forEach((viz) => {
    if (viz.descriptionComponent) {
      map.set(viz.id, defineAsyncComponent(viz.descriptionComponent));
    }
  });
  return map;
});

const singleDescriptionComponent = computed(() => {
  const loader = projectConfig.value?.descriptionComponent;
  return loader ? defineAsyncComponent(loader) : undefined;
});

const activeTimeValue = ref<number | undefined>(undefined);

watch(
  activeTimeControl,
  (control) => {
    activeTimeValue.value = control?.initial;
  },
  { immediate: true },
);

// Scrollytelling — all subviz sections stacked; the one whose title
// crosses a narrow band near the top of the scroll root becomes active.
const scrollRoot = ref<HTMLElement | null>(null);
const singleScrollRoot = ref<HTMLElement | null>(null);
const sectionRefs = ref<(HTMLElement | null)[]>([]);

// Scroll hint — shown only when there's more content below
const canScrollMore = ref(false);

function updateScrollHint() {
  const el = scrollRoot.value ?? singleScrollRoot.value;
  if (!el) {
    canScrollMore.value = false;
    return;
  }
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  canScrollMore.value = remaining > 8;
}

function setSectionRef(el: Element | null, i: number) {
  sectionRefs.value[i] = el as HTMLElement | null;
}

let observer: IntersectionObserver | null = null;
let suspendObserver = false;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;

function rebuildObserver() {
  observer?.disconnect();
  observer = null;
  // Compact layout uses chip-based subViz switching, no scrollytelling.
  if (isMobile.value) return;
  if (!scrollRoot.value || !subVizList.value?.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      if (suspendObserver) return;
      const topmost = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!topmost) return;
      const idx = Number((topmost.target as HTMLElement).dataset.idx);
      if (!Number.isNaN(idx)) activeSubVizIndex.value = idx;
    },
    {
      root: scrollRoot.value,
      rootMargin: "0px 0px -70% 0px",
      threshold: 0,
    },
  );

  sectionRefs.value.forEach((el) => {
    if (el) observer!.observe(el);
  });
}

watch(
  [drawerOpen, subVizList],
  async () => {
    await nextTick();
    rebuildObserver();
    updateScrollHint();
  },
  { immediate: true, flush: "post" },
);

watch([project, activeSubVizIndex], () => {
  nextTick(updateScrollHint);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (suspendTimer) clearTimeout(suspendTimer);
});

function onScrollHintClick() {
  const list = subVizList.value;
  if (list && activeSubVizIndex.value < list.length - 1) {
    scrollToSubViz(activeSubVizIndex.value + 1);
    return;
  }
  const el = scrollRoot.value ?? singleScrollRoot.value;
  if (!el) return;
  el.scrollBy({ top: el.clientHeight * 0.9, behavior: "smooth" });
}

function scrollToSubViz(i: number) {
  activeSubVizIndex.value = i;
  const el = sectionRefs.value[i];
  if (!el) return;
  suspendObserver = true;
  if (suspendTimer) clearTimeout(suspendTimer);
  suspendTimer = setTimeout(() => {
    suspendObserver = false;
  }, 800);
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const toggleDrawer = () => {
  drawerOpen.value = !drawerOpen.value;
};

const goBack = () => {
  router.push("/");
};

const toggleSheet = () => {
  sheetOpen.value = !sheetOpen.value;
};

const pickSubViz = (i: number) => {
  activeSubVizIndex.value = i;
};

const activeSubVizDescriptionComponent = computed(() => {
  const list = subVizList.value;
  if (!list) return undefined;
  const viz = list[activeSubVizIndex.value];
  return viz ? subVizDescriptionComponents.value.get(viz.id) : undefined;
});

const activeSubVizDescription = computed(() => {
  const list = subVizList.value;
  if (!list) return "";
  return list[activeSubVizIndex.value]?.description ?? "";
});

const activeSubVizTitle = computed(() => {
  const list = subVizList.value;
  if (!list) return "";
  return list[activeSubVizIndex.value]?.title ?? "";
});
</script>

<template>
  <div class="fit relative detail-bg">
    <!-- Project Drawer (desktop only) -->
    <div
      v-if="!isMobile"
      class="project-drawer absolute-left detail-bg"
      :class="{ 'drawer-open': drawerOpen, 'drawer-closed': !drawerOpen }"
    >
      <!-- Vertical control bar (always visible) -->
      <div class="control-bar">
        <q-btn
          flat
          dense
          square
          icon="arrow_back"
          @click="goBack"
          class="back-button-top detail-btn"
          size="md"
        />

        <!-- Vertical dot indicators — shown below back button when drawer open -->
        <div
          v-if="drawerOpen && subVizList && subVizList.length > 1"
          class="dot-indicators"
        >
          <button
            v-for="(viz, i) in subVizList"
            :key="viz.id"
            class="dot"
            :class="{ 'dot-active': i === activeSubVizIndex }"
            :aria-label="viz.title"
            @click="scrollToSubViz(i)"
          />
        </div>

        <div
          v-if="!drawerOpen"
          class="toggle-button-centered"
          @click="toggleDrawer"
        >
          <span class="vertical-text detail-text text-caption">MORE INFO</span>
        </div>
      </div>

      <!-- Toggle button on right when expanded -->
      <div v-if="drawerOpen" class="toggle-button-right" @click="toggleDrawer">
        <span class="vertical-text detail-text text-caption">REDUCE</span>
      </div>

      <!-- Drawer content (only visible when open) -->
      <div class="drawer-content" v-if="drawerOpen">
        <!-- Sub-viz scrollytelling layout -->
        <div v-if="subVizList && project" class="subviz-layout detail-text">
          <div class="project-header">
            <h1 class="text-h2 text-weight-light q-mb-xs">
              {{ project.title }}
            </h1>
            <div class="text-body1 detail-muted">
              {{ project.year }}
            </div>
          </div>

          <div
            ref="scrollRoot"
            class="subviz-scroll"
            @scroll.passive="updateScrollHint"
          >
            <section
              v-for="(viz, i) in subVizList"
              :key="viz.id"
              :ref="(el) => setSectionRef(el as Element | null, i)"
              :data-idx="i"
              class="subviz-section"
            >
              <h2 class="text-h4 text-weight-light q-mb-sm">
                {{ viz.title }}
              </h2>
              <component
                v-if="subVizDescriptionComponents.get(viz.id)"
                :is="subVizDescriptionComponents.get(viz.id)"
                class="text-body1"
                style="line-height: 1.8"
              />
              <div
                v-else
                class="text-body1 description-body"
                v-html="renderDescription(viz.description)"
              />
            </section>
          </div>
        </div>

        <!-- Standard single-viz layout -->
        <div
          v-else-if="project"
          ref="singleScrollRoot"
          class="detail-text drawer-inner-content"
          @scroll.passive="updateScrollHint"
        >
          <h1 class="text-h2 text-weight-light q-mb-xs">
            {{ project.title }}
          </h1>
          <div class="text-body1 detail-muted q-mb-xl">
            {{ project.year }}
          </div>
          <component
            v-if="singleDescriptionComponent"
            :is="singleDescriptionComponent"
            class="text-body1"
            style="line-height: 1.8"
          />
          <div
            v-else
            class="text-body1 description-body"
            v-html="renderDescription(project.description)"
          />
        </div>

        <!-- Scroll-more indicator: back-arrow styling, rotated down -->
        <div
          v-show="canScrollMore"
          class="scroll-hint"
          @click="onScrollHintClick"
        >
          <span class="vertical-text detail-text text-caption">SCROLL</span>
          <q-btn
            flat
            dense
            square
            icon="arrow_back"
            size="md"
            class="scroll-hint-btn detail-btn"
            :aria-label="
              subVizList && activeSubVizIndex < subVizList.length - 1
                ? 'Next section'
                : 'Scroll down'
            "
          />
        </div>
      </div>
    </div>

    <!-- Map Container -->
    <div
      class="map-container absolute"
      :class="{
        'map-with-drawer': drawerOpen,
        'map-full': !drawerOpen,
      }"
    >
      <DaveFlowsMap
        v-if="activeRenderer === 'deckgl-arcs'"
        :project-id="projectId"
        :data-url="activeDataUrl"
      />
      <CogRasterMap
        v-else-if="activeRenderer === 'deckgl-cog' && activeCogRaster"
        :project-id="projectId"
        :cog-raster="activeCogRaster"
        :active-time="activeTimeValue"
        :center="activeCenter"
        :zoom="activeZoom"
      />
      <ProjectMap
        v-else-if="project"
        :project-id="projectId"
        :active-time="activeTimeValue"
      />
      <div
        v-if="
          (!isMobile && subVizList && subVizList.length > 1) ||
          activeCogVariables ||
          activeLegend ||
          (activeTimeControl && activeTimeValue !== undefined)
        "
        class="map-bottom-bar"
        :class="{ 'map-bottom-bar-mobile': isMobile }"
      >
        <div
          v-if="
            (!isMobile && subVizList && subVizList.length > 1) ||
            activeCogVariables
          "
          class="selectors-group"
        >
          <div
            v-if="!isMobile && subVizList && subVizList.length > 1"
            class="subviz-selector"
            role="tablist"
          >
            <button
              v-for="(viz, i) in subVizList"
              :key="viz.id"
              type="button"
              role="tab"
              class="subviz-chip"
              :class="{ active: i === activeSubVizIndex }"
              :aria-selected="i === activeSubVizIndex"
              @click="scrollToSubViz(i)"
            >
              {{ viz.title }}
            </button>
          </div>
          <VariableSelector
            v-if="activeCogVariables?.length"
            v-model="activeVariableId"
            :variables="activeCogVariables"
          />
        </div>
        <MapLegend
          v-if="activeLegend"
          :legend="activeLegend"
          class="legend-wrap"
        />
        <div
          v-if="activeTimeControl && activeTimeValue !== undefined"
          class="time-slider-wrap"
        >
          <TimeSlider
            v-model="activeTimeValue"
            :min="activeTimeControl.min"
            :max="activeTimeControl.max"
            :step="activeTimeControl.step"
            :label="activeTimeControl.label"
            :display-format="activeTimeControl.displayFormat"
            :autoplay-interval-ms="activeTimeControl.autoplayIntervalMs"
          />
        </div>
      </div>
    </div>

    <!-- Mobile bottom sheet -->
    <div
      v-if="isMobile && project"
      class="project-sheet"
      :class="{ 'sheet-open': sheetOpen, 'sheet-closed': !sheetOpen }"
    >
      <button
        type="button"
        class="sheet-header"
        :aria-expanded="sheetOpen"
        aria-label="Toggle project details"
        @click="toggleSheet"
      >
        <div class="sheet-grip" />
        <div class="sheet-header-row">
          <div class="sheet-header-text">
            <div class="text-h6 sheet-title">{{ project.title }}</div>
            <div class="text-caption sheet-year">{{ project.year }}</div>
          </div>
          <q-icon
            name="keyboard_arrow_up"
            size="24px"
            class="sheet-chevron"
            :class="{ flipped: sheetOpen }"
          />
        </div>
        <div
          v-if="subVizList && subVizList.length > 1"
          class="sheet-chips"
          role="tablist"
          @click.stop
        >
          <button
            v-for="(viz, i) in subVizList"
            :key="viz.id"
            type="button"
            role="tab"
            class="subviz-chip sheet-chip"
            :class="{ active: i === activeSubVizIndex }"
            :aria-selected="i === activeSubVizIndex"
            @click="pickSubViz(i)"
          >
            {{ viz.title }}
          </button>
        </div>
      </button>

      <div class="sheet-content">
        <template v-if="subVizList">
          <h2 class="text-h5 text-weight-light q-mb-sm">
            {{ activeSubVizTitle }}
          </h2>
          <component
            v-if="activeSubVizDescriptionComponent"
            :is="activeSubVizDescriptionComponent"
            class="text-body1"
            style="line-height: 1.8"
          />
          <div
            v-else
            class="text-body1 description-body"
            v-html="renderDescription(activeSubVizDescription)"
          />
        </template>
        <template v-else>
          <component
            v-if="singleDescriptionComponent"
            :is="singleDescriptionComponent"
            class="text-body1"
            style="line-height: 1.8"
          />
          <div
            v-else
            class="text-body1 description-body"
            v-html="renderDescription(project.description)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-drawer {
  top: 0;
  bottom: 0;
  display: flex;
  transition: width 0.3s ease-out;
  z-index: 100;
}

.drawer-open {
  width: 50vw;
}

.drawer-closed {
  width: 86px;
}

.control-bar {
  width: 86px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  z-index: 102;
}

.back-button-top {
  margin-top: 15vh;
}

.dot-indicators {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  border: none;
  background: var(--color-border-strong);
  cursor: pointer;
  padding: 0;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.dot:hover {
  background: var(--color-text-muted);
}

.dot-active {
  background: var(--color-text);
  transform: scale(1.5);
}

.subviz-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--color-surface);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-radius: 10px;
}

.subviz-chip {
  padding: 4px 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: 14px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  text-align: center;
  white-space: nowrap;
}

.subviz-chip:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.subviz-chip.active {
  background: var(--color-border-strong);
  border-color: var(--color-text);
  color: var(--color-text);
}

.toggle-button-centered {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-button-right {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  padding: 20px 10px;
  z-index: 101;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toggle-button:hover .vertical-text,
.toggle-button-right:hover .vertical-text {
  opacity: 1;
}

.drawer-content {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scroll-hint {
  position: absolute;
  right: 16px;
  bottom: 3vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.scroll-hint :deep(.vertical-text) {
  padding: 20px 10px;
}

.scroll-hint :deep(.q-icon) {
  transform: rotate(-90deg);
}

.scroll-hint-btn {
  opacity: 0.7;
}

.drawer-inner-content {
  flex: 1;
  padding: 15vh 12% 8vh 12%;
  max-width: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.drawer-inner-content::-webkit-scrollbar {
  display: none;
}

.subviz-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.project-header {
  flex-shrink: 0;
  padding: 12vh 12% 3vh;
  background: var(--color-bg);
}

.detail-bg {
  background: var(--color-bg);
  color: var(--color-text);
}

.detail-text {
  color: var(--color-text);
}

.detail-muted {
  color: var(--color-text-muted);
}

.detail-btn {
  color: var(--color-text);
}

.description-body {
  line-height: 1.8;
}
.description-body :deep(p) {
  margin: 0 0 0.8em;
}
.description-body :deep(p:last-child) {
  margin-bottom: 0;
}
.description-body :deep(ul),
.description-body :deep(ol) {
  margin: 0.4em 0 0.8em;
  padding-left: 1.5em;
}
.description-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  background: rgba(128, 128, 128, 0.15);
  border-radius: 3px;
}
.description-body :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.subviz-scroll {
  flex: 1;
  padding: 0 12% 8vh;
  overflow-y: auto;
  scrollbar-width: none;
}

.subviz-scroll::-webkit-scrollbar {
  display: none;
}

.subviz-section {
  min-height: 30vh;
  padding-bottom: 8vh;
  scroll-margin-top: 4vh;
}

.subviz-section:last-of-type {
  padding-bottom: 60vh;
}

.map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  transition: all 0.3s ease-out;
}

.map-with-drawer {
  left: 50vw;
}

.map-full {
  left: 70px;
}

/* Compact layouts hide the drawer, so the map fills the viewport. */
@media (max-width: 1023px) {
  .map-with-drawer,
  .map-full {
    left: 0;
  }
}

.map-bottom-bar {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 110;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 14px;
  pointer-events: none;
}

.map-bottom-bar > * {
  pointer-events: auto;
}

.selectors-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  align-self: flex-end;
  min-width: 140px;
  max-width: 260px;
}

.legend-wrap {
  flex-shrink: 0;
  align-self: flex-end;
}

.time-slider-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: stretch;
}

.map-bottom-bar-mobile {
  left: 12px;
  right: 12px;
  /* Sits above the 96px collapsed sheet peek plus a 12px gap. */
  bottom: calc(108px + env(safe-area-inset-bottom, 0px));
  flex-direction: row;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.map-bottom-bar-mobile .selectors-group {
  min-width: 0;
  max-width: 180px;
  align-self: flex-end;
}

.map-bottom-bar-mobile .legend-wrap {
  align-self: flex-end;
  flex-shrink: 0;
}

/* Slider takes its own row; a shared one would leave too little track. */
.map-bottom-bar-mobile .time-slider-wrap {
  flex: 1 1 100%;
  align-self: stretch;
}

.project-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 150;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  border-top: 1px solid var(--color-border);
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  color: var(--color-text);
  transition: height 0.32s cubic-bezier(0.22, 0.8, 0.28, 1);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.sheet-closed {
  height: 96px;
}

.sheet-open {
  height: 82vh;
}

.sheet-header {
  appearance: none;
  background: transparent;
  border: 0;
  color: inherit;
  text-align: left;
  padding: 10px 18px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.sheet-grip {
  width: 42px;
  height: 4px;
  border-radius: 3px;
  background: var(--color-border-strong);
  margin: 0 auto 4px;
  opacity: 0.9;
}

.sheet-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sheet-header-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sheet-title {
  color: var(--color-text);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-year {
  color: var(--color-text-muted);
}

.sheet-chevron {
  color: var(--color-text-muted);
  transition: transform 0.3s ease;
}

.sheet-chevron.flipped {
  transform: rotate(180deg);
}

.sheet-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin: 0 -6px;
  padding: 0 6px;
}

.sheet-chips::-webkit-scrollbar {
  display: none;
}

.sheet-chip {
  flex-shrink: 0;
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px 32px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.sheet-content::-webkit-scrollbar {
  display: none;
}
</style>
