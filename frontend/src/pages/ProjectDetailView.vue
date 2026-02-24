<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import ProjectMap from "@/components/features/ProjectMap.vue";
import DaveFlowsMap from "@/components/features/DaveFlowsMap.vue";
import { allProjects, projectsGeoJSON } from "@/config/projects";
import { computed, onUnmounted, ref } from "vue";

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;
const drawerOpen = ref(true);

const project = computed(() => {
  const feature = projectsGeoJSON.features.find(
    (f) => f.properties.id === projectId,
  );
  return feature?.properties;
});

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

// Scroll to switch sub-viz — debounced so one scroll gesture = one step
let scrollCooldown = false;

function onWheel(e: WheelEvent) {
  if (!subVizList.value || scrollCooldown) return;
  const list = subVizList.value;
  if (e.deltaY > 0 && activeSubVizIndex.value < list.length - 1) {
    activeSubVizIndex.value++;
  } else if (e.deltaY < 0 && activeSubVizIndex.value > 0) {
    activeSubVizIndex.value--;
  } else {
    return;
  }
  scrollCooldown = true;
  setTimeout(() => {
    scrollCooldown = false;
  }, 500);
}

onUnmounted(() => {
  scrollCooldown = false;
});

const toggleDrawer = () => {
  drawerOpen.value = !drawerOpen.value;
};

const goBack = () => {
  router.push("/");
};
</script>

<template>
  <div class="fit relative bg-black">
    <!-- Project Drawer -->
    <div
      class="project-drawer absolute-left bg-black"
      :class="{ 'drawer-open': drawerOpen, 'drawer-closed': !drawerOpen }"
    >
      <!-- Vertical control bar (always visible) -->
      <div class="control-bar">
        <q-btn
          flat
          dense
          square
          icon="arrow_back"
          color="white"
          @click="goBack"
          class="back-button-top"
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
            @click="activeSubVizIndex = i"
          />
        </div>

        <div
          v-if="!drawerOpen"
          class="toggle-button-centered"
          @click="toggleDrawer"
        >
          <span class="vertical-text text-white text-caption">MORE INFO</span>
        </div>
      </div>

      <!-- Toggle button on right when expanded -->
      <div v-if="drawerOpen" class="toggle-button-right" @click="toggleDrawer">
        <span class="vertical-text text-white text-caption">REDUCE</span>
      </div>

      <!-- Drawer content (only visible when open) -->
      <div class="drawer-content" v-if="drawerOpen" @wheel.passive="onWheel">
        <!-- Sub-viz carousel layout -->
        <div
          v-if="subVizList && project"
          class="text-white drawer-inner-content"
        >
          <h1 class="text-h2 text-weight-light q-mb-xs">
            {{ project.title }}
          </h1>
          <div class="text-body1 text-grey-5 q-mb-xl">
            {{ project.year }}
          </div>

          <!-- Active sub-viz content -->
          <transition name="fade" mode="out-in">
            <div :key="activeSubVizIndex">
              <h2 class="text-h4 text-weight-light q-mb-sm">
                {{ subVizList[activeSubVizIndex].title }}
              </h2>
              <div class="text-body1" style="line-height: 1.8">
                {{ subVizList[activeSubVizIndex].description }}
              </div>
            </div>
          </transition>
        </div>

        <!-- Standard single-viz layout -->
        <div v-else-if="project" class="text-white drawer-inner-content">
          <h1 class="text-h2 text-weight-light q-mb-xs">
            {{ project.title }}
          </h1>
          <div class="text-body1 text-grey-5 q-mb-xl">
            {{ project.year }}
          </div>
          <div class="text-body1" style="line-height: 1.8">
            {{ project.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- Map Container -->
    <div
      class="map-container absolute"
      :class="{ 'map-with-drawer': drawerOpen, 'map-full': !drawerOpen }"
    >
      <DaveFlowsMap
        v-if="activeRenderer === 'deckgl-arcs'"
        :project-id="projectId"
        :data-url="activeDataUrl"
      />
      <ProjectMap v-else-if="project" :project-id="projectId" />
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
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  padding: 0;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.dot:hover {
  background: rgba(255, 255, 255, 0.5);
}

.dot-active {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.5);
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
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
</style>
