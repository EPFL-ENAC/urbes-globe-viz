<script setup lang="ts">
import { useRoute } from "vue-router";
import ProjectMap from "@/components/features/ProjectMap.vue";
import DaveFlowsMap from "@/components/features/DaveFlowsMap.vue";
import CogRasterMap from "@/components/features/CogRasterMap.vue";
import MapLegend from "@/components/features/MapLegend.vue";
import TimeSlider from "@/components/common/TimeSlider.vue";
import VariableSelector from "@/components/common/VariableSelector.vue";
import { allProjects, projectsGeoJSON } from "@/config/projects";
import type { SubViz } from "@/config/projects/types";
import { renderDescription } from "@/utils/markdown";
import { DEFAULT_TITLE } from "@/router";
import { useIsCompactProject } from "@/composables/useIsMobile";
import { isPreviewMode, previewVizId } from "@/utils/previewMode";
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

// Screenshot runs may target a specific sub-viz via `?viz=<id>` so the landing
// page billboard shows e.g. mobility flows instead of the default bars.
const initialSubVizIndex = (() => {
  if (!isPreviewMode || !previewVizId) return 0;
  const index = allProjects
    .find((p) => p.id === projectId)
    ?.subViz?.findIndex((viz) => viz.id === previewVizId);
  return index != null && index >= 0 ? index : 0;
})();

const activeSubVizIndex = ref(initialSubVizIndex);

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
  // Screenshot runs frame further out (see ProjectMap.vue) so landing-page
  // billboards read as vignettes beside the hero text.
  if (isPreviewMode && projectConfig.value?.previewZoom != null) {
    return projectConfig.value.previewZoom;
  }
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.zoom ??
      projectConfig.value?.zoom
    );
  }
  return projectConfig.value?.zoom;
});

const activePitch = computed(() => {
  if (subVizList.value) {
    return (
      subVizList.value[activeSubVizIndex.value]?.pitch ??
      projectConfig.value?.pitch
    );
  }
  return projectConfig.value?.pitch;
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

// Legend and time control do NOT fall back to the project level when subViz
// is present - a top-level config (kept there for ProjectMap/mapLayers) would
// otherwise leak onto sibling sub-vizzes that use a different renderer.
const activeLegend = computed(() => {
  if (activeCogVariable.value?.legend) return activeCogVariable.value.legend;
  if (subVizList.value) {
    return subVizList.value[activeSubVizIndex.value]?.legend;
  }
  return projectConfig.value?.legend;
});

const activeTimeControl = computed(() => {
  if (subVizList.value) {
    return subVizList.value[activeSubVizIndex.value]?.timeControl;
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

// Hub Scroll — project overview + one panel per subViz domain, titles
// stacking bottom-to-top as the user scrolls past each one (design draft:
// "Project Detail - Hub Scroll"). Section 0 is always the project overview;
// section i>=1 maps to subVizList[i-1] and drives the existing map/legend
// computeds via activeSubVizIndex, same as before.
const scrollRoot = ref<HTMLElement | null>(null);

const HUB_STRIP_H = 46; // title bar height, px (keep in sync with .hub-title height)
// Stacked titles sit HUB_PEEK apart, so each is overlapped by the one below it —
// covering only ~20% of its height (80% still shows). The active title is the
// last in its docked group with nothing below to cover it, so it reads in full.
const HUB_PEEK = HUB_STRIP_H * 0.8;
const HUB_TOP_PAD = 72; // clears the fixed 60px NavigationBar (+12), so docked titles read

const hubContainerH = ref(0);

interface HubSection {
  key: string;
  tag: string;
  title: string;
  viz: SubViz | null; // null only for the overview (index 0)
}

// "CODE - Place" titles (e.g. "WRF d02 - Lake Geneva Region") split into a
// small tag + the main title; titles without that separator (e.g.
// hourly_adult_population's subViz) just render as-is with no tag.
// Projects WITHOUT subViz render as a single-section hub (just the overview) —
// same layout, same classes, no parallel single-viz template.
const hubSections = computed<HubSection[]>(() => {
  if (!project.value) return [];
  const overview: HubSection = {
    key: "overview",
    tag: String(project.value.year),
    title: project.value.title,
    viz: null,
  };
  const list = subVizList.value;
  if (!list) return [overview];
  const rest: HubSection[] = list.map((viz) => {
    const [first, ...others] = viz.title.split(" - ");
    return others.length
      ? { key: viz.id, tag: first ?? "", title: others.join(" - "), viz }
      : { key: viz.id, tag: "", title: viz.title, viz };
  });
  return [overview, ...rest];
});

const hubN = computed(() => hubSections.value.length);
const hubActiveIndex = ref(0);

// Sticky insets per title: once scrolled past its flow position a title docks
// in the top stack; before being reached it pins parked in the bottom stack.
// Pure functions of the index — the browser animates everything, no per-scroll
// style updates.
function hubTitleTop(i: number) {
  return HUB_TOP_PAD + i * HUB_PEEK;
}

function hubTitleStyle(i: number) {
  return {
    top: hubTitleTop(i) + "px",
    bottom: (hubN.value - 1 - i) * HUB_PEEK + "px",
    zIndex: 10 + i,
  };
}

// Sticky inset for a section's text block: right where it sits in static flow
// under its docked title (title bottom + the content's 16px top padding), so
// pinning engages without any visual jump. Short content then stays visible
// while its section's empty remainder scrolls beneath; long content has no
// slack inside its parent, so it never pins and scrolls 1:1.
function hubContentStickyTop(i: number) {
  return hubTitleTop(i) + HUB_STRIP_H + 16;
}

// Tail stop, applied to the LAST section only: the stage height between a
// docked title and the parked stack below it. Earlier sections flow at their
// natural height (so short ones read together instead of each dragging a
// viewport of blank column), and this tail is exactly the scroll range the
// last title needs to reach its own top dock.
const hubContentMinH = computed(() =>
  Math.max(
    0,
    hubContainerH.value -
      HUB_TOP_PAD -
      HUB_STRIP_H -
      Math.max(0, hubN.value - 1) * HUB_PEEK,
  ),
);

// Flow positions of the .hub-content blocks, cached so the scroll handler is a
// handful of comparisons. Measured from the content elements (plain flow), not
// the sticky titles — sticky elements report displaced offsets. Title i's flow
// position is its content's offsetTop minus the title's own height.
let hubContentOffsets: number[] = [];

function measureHub() {
  const root = scrollRoot.value;
  if (!root) return;
  hubContainerH.value = root.clientHeight;
  hubContentOffsets = Array.from(
    root.querySelectorAll<HTMLElement>(".hub-content"),
    (el) => el.offsetTop,
  );
}

// Watches the content blocks for size changes (async description SFCs — charts
// — grow after mount), which shift every offset below them. With natural
// section heights that growth also moves the docking thresholds, so re-derive
// the active section from the current scrollTop.
const hubResizeObserver = new ResizeObserver(() => {
  measureHub();
  onHubScroll();
});

function observeHubContents() {
  hubResizeObserver.disconnect();
  scrollRoot.value
    ?.querySelectorAll<HTMLElement>(".hub-content")
    .forEach((el) => hubResizeObserver.observe(el));
}

function onHubScroll() {
  const root = scrollRoot.value;
  if (!root) return;
  const st = root.scrollTop;
  // Active = last title that has docked (reached its sticky top inset).
  let active = 0;
  for (let i = 1; i < hubContentOffsets.length; i++) {
    const flowTop = hubContentOffsets[i]! - HUB_STRIP_H;
    if (st >= flowTop - hubTitleTop(i) - 1) active = i;
    else break;
  }
  hubActiveIndex.value = active; // same-value writes don't re-render
}

// Section 0 (overview) doesn't drive the map — it just introduces the
// project over whatever camera the first domain already set.
watch(hubActiveIndex, (i) => {
  activeSubVizIndex.value = Math.max(0, i - 1);
});

watch(
  [drawerOpen, subVizList],
  async () => {
    await nextTick();
    measureHub();
    observeHubContents();
    // Closing the drawer unmounts scrollRoot (v-if); reopening mounts a fresh
    // node whose native scrollTop is always 0. Restore it so the previously
    // active section is docked again — a no-op on first mount (index 0 docks
    // at scrollTop 0), a real restore on reopen (hubActiveIndex survives as a
    // plain ref even though the DOM node doesn't).
    const root = scrollRoot.value;
    const i = hubActiveIndex.value;
    if (root && i > 0 && hubContentOffsets[i] !== undefined) {
      root.scrollTop = hubContentOffsets[i] - HUB_STRIP_H - hubTitleTop(i);
    }
  },
  { immediate: true, flush: "post" },
);

window.addEventListener("resize", measureHub, { passive: true });
onBeforeUnmount(() => {
  window.removeEventListener("resize", measureHub);
  hubResizeObserver.disconnect();
});

// hubIndex 0 is the overview; hubIndex i>=1 is subVizList[i-1].
function scrollToHub(i: number) {
  activeSubVizIndex.value = Math.max(0, i - 1);
  const el = scrollRoot.value;
  if (!el || hubContentOffsets[i] === undefined) return;
  // Lands with title i exactly docked at its sticky top inset.
  el.scrollTo({
    top: Math.max(0, hubContentOffsets[i] - HUB_STRIP_H - hubTitleTop(i)),
    behavior: "smooth",
  });
}

function scrollToSubViz(i: number) {
  scrollToHub(i + 1);
}

const toggleDrawer = () => {
  drawerOpen.value = !drawerOpen.value;
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
  <div
    class="fit relative detail-bg"
    :class="{ 'preview-mode': isPreviewMode }"
  >
    <!-- Project Drawer (desktop only) -->
    <div
      v-if="!isMobile"
      class="project-drawer absolute-left detail-bg"
      :class="{ 'drawer-open': drawerOpen, 'drawer-closed': !drawerOpen }"
    >
      <!-- Drawer content (only visible when open) -->
      <div class="drawer-content" v-if="drawerOpen">
        <!-- Hub scroll layout (all projects — a no-subViz project is simply a
             single-section hub): one native scroll flow. Titles are sticky
             with both insets — parked at the bottom before their section is
             reached, docked at the top after. Content is plain flow that
             slides under both stacks; the browser animates everything. -->
        <div v-if="project" class="subviz-layout detail-text">
          <div
            ref="scrollRoot"
            class="hub-scroll"
            :class="{ 'hub-solo': hubN === 1 }"
            @scroll.passive="onHubScroll"
          >
            <!-- Flow spacer, NOT padding on the scroller: Chrome measures
                 sticky top insets from the scroller's content edge, so
                 padding-top would shift every docked title down by 72px. -->
            <div class="hub-topspacer" aria-hidden="true" />
            <template v-for="(section, i) in hubSections" :key="section.key">
              <button
                type="button"
                class="hub-title"
                :class="{
                  'hub-title-active': i === hubActiveIndex,
                  'hub-title-past': i < hubActiveIndex,
                }"
                :style="hubTitleStyle(i)"
                @click="scrollToHub(i)"
              >
                <span class="hub-tnum">{{
                  String(i + 1).padStart(2, "0")
                }}</span>
                <span class="hub-ttitle">{{ section.title }}</span>
                <span v-if="section.tag" class="hub-ttag">{{
                  section.tag
                }}</span>
              </button>

              <!-- Natural height, so short sections read together on open.
                   Only the last one is stretched to a full stop, which is the
                   scroll range every title needs to reach its top dock. -->
              <div
                class="hub-content"
                :style="
                  i === hubN - 1 ? { minHeight: hubContentMinH + 'px' } : {}
                "
              >
                <!-- Sticky within its section only: on the stretched last
                     section short text pins below its docked title while the
                     empty remainder scrolls beneath; elsewhere there is no
                     slack, so sticky never engages and it scrolls 1:1. -->
                <div
                  class="hub-content-inner"
                  :style="{ top: hubContentStickyTop(i) + 'px' }"
                >
                  <component
                    v-if="
                      section.viz
                        ? subVizDescriptionComponents.get(section.viz.id)
                        : singleDescriptionComponent
                    "
                    :is="
                      section.viz
                        ? subVizDescriptionComponents.get(section.viz.id)
                        : singleDescriptionComponent
                    "
                    class="text-body1"
                    style="line-height: 1.8"
                  />
                  <div
                    v-else
                    class="text-body1 description-body"
                    v-html="
                      renderDescription(
                        section.viz
                          ? section.viz.description
                          : project.description,
                      )
                    "
                  />
                </div>
              </div>
            </template>
          </div>
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
      <!-- Collapse/expand the info panel. Lives on the map side so it rides the
           seam in both states; square bordered idiom matches the map controls. -->
      <q-btn
        v-if="!isMobile"
        flat
        square
        :icon="drawerOpen ? 'chevron_left' : 'chevron_right'"
        size="md"
        class="drawer-toggle"
        :aria-label="drawerOpen ? 'Collapse panel' : 'Expand panel'"
        @click="toggleDrawer"
      />
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
        :pitch="activePitch"
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
  width: 0;
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
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Square seam button: collapse/expand the info panel. Rides the drawer/map seam
   (lives in .map-container), styled like the map's own square controls. */
.drawer-toggle {
  position: absolute;
  left: 16px;
  top: 72px;
  z-index: 120;
  width: 34px;
  height: 34px;
  min-height: 34px;
  background: var(--color-bg);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-muted);
  transition: color 0.15s ease;
}

.drawer-toggle:hover {
  color: var(--color-text);
}

.drawer-content {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.subviz-layout {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Opaque strip over the navbar clearance band (0..HUB_TOP_PAD): content
   scrolling past the docked stack would otherwise stay visible there, sliding
   up behind the transparent navbar until it leaves the scrollport. */
.subviz-layout::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 72px; /* keep in sync with HUB_TOP_PAD */
  background: var(--color-bg);
  z-index: 50;
  pointer-events: none;
}

.detail-bg {
  background: var(--color-bg);
  color: var(--color-text);
}

.detail-text {
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

/* One native scroll flow: sticky titles interleaved with plain content. */
.hub-scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.hub-scroll::-webkit-scrollbar {
  display: none;
}

/* Puts title 0's flow start at its own sticky inset (72), so the overview is
   docked and open at scrollTop 0. A flow element, not scroller padding — see
   the template comment. Keep in sync with HUB_TOP_PAD. */
.hub-topspacer {
  height: 72px;
}

/* Single-section hub (project without subViz): numbering and the title's
   separator line only make sense with siblings to relate to. */
.hub-solo .hub-tnum {
  display: none;
}

.hub-solo .hub-title {
  border-bottom: 0;
}

/* Sticky with both insets (bound inline per index): pins parked at the bottom
   before its section is reached, docks at the top once scrolled past. Opaque
   background + ascending z-index give the ~20% overlap in both stacks. */
.hub-title {
  position: sticky;
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 48px;
  background: var(--color-bg);
  border: 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
  color: var(--color-text-muted);
  transition: color 0.2s ease;
}

.hub-title-active,
.hub-title-past {
  color: var(--color-text);
}

.hub-title-active .hub-ttitle {
  color: var(--color-accent);
}

.hub-tnum {
  flex-shrink: 0;
  width: 24px;
  font-family: var(--font-sans);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.hub-ttitle {
  flex: 1;
  min-width: 0;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: clamp(17px, 1.8vw, 24px);
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.hub-ttag {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* Plain flow content: scrolls 1:1 and slides under both opaque title stacks.
   Height is natural; only the last section carries an inline min-height. */
.hub-content {
  padding: 16px 48px 32px;
}

/* The section's text block; sticky top inset bound inline per section. Its
   containing block is .hub-content, so the pin only has slack when the section
   is taller than its text — i.e. on the stretched last section, or on any
   section whose content is shorter than a component that grew inside it. */
.hub-content-inner {
  position: sticky;
}

/* Hub content reads smaller than the app default (which the mobile sheet and
   single-viz layout keep), so more of a section fits per screen. Covers both
   the markdown v-html and the SFC description components, which inherit this
   text-body1 root. */
.hub-content :deep(.text-body1) {
  font-size: 0.875rem;
}

.map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  transition: all 0.3s ease-out;
}

/* Build-time screenshot mode: drop all chrome and let the map fill the
   viewport so the capture is a clean, full-bleed square. */
.preview-mode .project-drawer,
.preview-mode .drawer-toggle,
.preview-mode .map-bottom-bar,
.preview-mode .project-sheet {
  display: none !important;
}

.preview-mode .map-container {
  left: 0 !important;
}

/* Data-only capture: strip the page background so the screenshot is transparent
   (basemap is hidden in preview mode; the map canvas is already alpha). */
.preview-mode.detail-bg {
  background: transparent !important;
}

.map-with-drawer {
  left: 50vw;
}

.map-full {
  left: 0;
}

/* Compact layouts hide the drawer, so the map fills the viewport. */
@media (max-width: 1023px) {
  .map-with-drawer,
  .map-full {
    left: 0;
  }
}

/* Large screens: a 50/50 split leaves an oversized reading column — give the
   map the room instead (40/60) and scale the reading typography up, with a
   measure cap so lines stay readable in the still-wide column. */
@media (min-width: 1600px) {
  .drawer-open {
    width: 40vw;
  }

  .map-with-drawer {
    left: 40vw;
  }

  .hub-content :deep(.text-body1) {
    font-size: 1rem;
  }

  .hub-content-inner {
    max-width: 70ch;
  }

  .hub-ttitle {
    font-size: clamp(20px, 1.5vw, 30px);
  }

  .hub-tnum {
    font-size: 12px;
  }

  .hub-ttag {
    font-size: 11px;
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
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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
