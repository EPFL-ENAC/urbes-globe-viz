<script lang="ts">
// Module-level: shared across all ProjectCard instances so card A's leave
// timeout is properly cancelled when card B's hover fires
let sharedLeaveTimeout: number | null = null;
</script>

<script setup lang="ts">
import type { ProjectProperties } from "@/config/projects";
import { useProjectStore } from "@/stores/project";
import { useIsMobile } from "@/composables/useIsMobile";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  project: ProjectProperties;
}>();

const projectStore = useProjectStore();
const router = useRouter();
const isMobile = useIsMobile();

const isHovered = computed(
  () => projectStore.hoveredProjectId === props.project.id,
);

const handleHover = () => {
  // On mobile the globe is a passive background, so hover-preview has no
  // visual effect and shouldn't churn the shared store.
  if (isMobile.value) return;
  if (sharedLeaveTimeout) {
    clearTimeout(sharedLeaveTimeout);
    sharedLeaveTimeout = null;
  }
  projectStore.setHoveredProject(props.project.id);
};

const handleLeave = () => {
  if (isMobile.value) return;
  sharedLeaveTimeout = window.setTimeout(() => {
    projectStore.setHoveredProject(null);
    sharedLeaveTimeout = null;
  }, 100);
};

const handleClick = () => {
  router.push(`/project/${props.project.id}`);
};
</script>

<template>
  <div
    class="cursor-pointer project-card"
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
    <div class="card-text text-left">
      <div class="card-title">{{ project.title }}</div>
      <div class="card-year">{{ project.year }}</div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
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
  background: var(--color-surface-raised);
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-text {
  color: var(--color-text);
  padding-top: 8px;
}

.card-title {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
}

.card-year {
  font-size: 0.875rem;
  color: var(--color-text);
}

@media (max-width: 767px) {
  .project-card {
    flex-direction: row;
    align-items: flex-start;
    gap: 18px;
    transition: opacity 0.15s ease;
  }

  .project-card:hover,
  .project-card-highlighted {
    transform: none;
  }

  .project-card:active {
    opacity: 0.6;
  }

  .card-image {
    width: 112px;
    height: 112px;
  }

  .card-text {
    flex: 1;
    min-width: 0;
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 500;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .card-year {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
}
</style>
