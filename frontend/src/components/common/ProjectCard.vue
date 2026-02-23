<script setup lang="ts">
import type { ProjectProperties } from "@/data/projects";
import { useProjectStore } from "@/stores/project";
import { projectsGeoJSON } from "@/data/projects";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  project: ProjectProperties;
}>();

const projectStore = useProjectStore();
const router = useRouter();
let leaveTimeout: number | null = null;

const isHovered = computed(
  () => projectStore.hoveredProjectId === props.project.id,
);

const handleHover = () => {
  // Clear any pending leave timeout
  if (leaveTimeout) {
    clearTimeout(leaveTimeout);
    leaveTimeout = null;
  }

  const feature = projectsGeoJSON.features.find(
    (f) => f.properties.id === props.project.id,
  );
  if (feature && feature.geometry.coordinates) {
    const [longitude, latitude] = feature.geometry.coordinates;
    if (longitude !== undefined && latitude !== undefined) {
      projectStore.setTargetCoordinates(longitude, latitude);
    }
  }
  projectStore.setHoveredProject(props.project.id);
};

const handleLeave = () => {
  // Add small delay before clearing to prevent flickering
  leaveTimeout = window.setTimeout(() => {
    projectStore.clearTargetCoordinates();
    projectStore.setHoveredProject(null);
    leaveTimeout = null;
  }, 100);
};

const handleClick = () => {
  router.push(`/project/${props.project.id}`);
};
</script>

<template>
  <div
    class="column cursor-pointer project-card"
    :class="{ 'project-card-highlighted': isHovered }"
    @mouseenter="handleHover"
    @mouseleave="handleLeave"
    @click="handleClick"
  >
    <div class="card-image overflow-hidden">
      <img
        v-if="project.preview"
        :src="`/previews/${project.preview}`"
        :alt="project.title"
        class="card-img"
      />
    </div>
    <div class="q-pt-sm text-white text-left text-subtitle2">
      <div>
        {{ project.title }}
      </div>
      <div>
        {{ project.year }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.project-card:hover,
.project-card-highlighted {
  transform: scale(1.05);
}

.card-image {
  width: 120px;
  height: 120px;
  background: #1a1a1a;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
