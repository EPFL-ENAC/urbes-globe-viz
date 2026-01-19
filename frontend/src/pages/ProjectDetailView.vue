<script setup lang="ts">
import { useRoute } from "vue-router";
import ProjectMap from "@/components/features/ProjectMap.vue";
import { projectsGeoJSON } from "@/data/projects";
import { computed } from "vue";

const route = useRoute();
const projectId = route.params.id as string;

const project = computed(() => {
  const feature = projectsGeoJSON.features.find(
    (f) => f.properties.id === projectId,
  );
  return feature?.properties;
});
</script>

<template>
  <div class="fit relative">
    <ProjectMap v-if="project" :project-id="projectId" />
  </div>
</template>

<style scoped>
.project-info-card {
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}
</style>
