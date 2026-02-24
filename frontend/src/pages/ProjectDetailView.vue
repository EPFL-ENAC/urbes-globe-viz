<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import ProjectMap from "@/components/features/ProjectMap.vue";
import DaveFlowsMap from "@/components/features/DaveFlowsMap.vue";
import { projectsGeoJSON } from "@/data/projects";
import { computed, ref } from "vue";

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
      <div class="drawer-content" v-if="drawerOpen">
        <div v-if="project" class="text-white drawer-inner-content">
          <h1 class="text-h2 text-weight-light q-mb-xs">
            {{ project.title }}
          </h1>
          <div class="text-body1 text-grey-5 q-mb-xl">
            {{ project.year }}
          </div>

          <div class="text-body1 q-mb-lg" style="line-height: 1.8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </div>

          <div class="text-body1 q-mb-lg" style="line-height: 1.8">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
            quae ab illo inventore veritatis et quasi architecto beatae vitae
            dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit
            aspernatur aut odit aut fugit.
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
        v-if="project && projectId === 'dave_flows_work'"
        :project-id="projectId"
      />
      <ProjectMap
        v-else-if="project"
        :project-id="projectId"
      />
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
  right: 0;
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
  overflow-y: auto;
}

.drawer-inner-content {
  flex: 1;
  padding: 15vh 12% 8vh 12%;
  max-width: 100%;
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
