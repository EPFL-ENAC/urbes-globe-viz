<script setup lang="ts">
import Globe3D from "@/components/features/Globe3D.vue";
import ProjectCard from "@/components/common/ProjectCard.vue";
import { projectsGeoJSON } from "@/config/projects";

const projectsDuplicated = projectsGeoJSON.features.concat(
  projectsGeoJSON.features,
  projectsGeoJSON.features,
  projectsGeoJSON.features,
  projectsGeoJSON.features,
);
</script>

<template>
  <div class="relative bg-black overflow-hidden" style="height: 100vh">
    <Globe3D />

    <div class="absolute-bottom full-width q-pa-md" style="z-index: 100">
      <div
        class="row q-gutter-md no-wrap overflow-auto"
        style="scrollbar-width: none; -ms-overflow-style: none"
      >
        <ProjectCard
          v-for="feature in projectsDuplicated"
          :key="feature.properties.id"
          :project="feature.properties"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-auto::-webkit-scrollbar {
  display: none;
}
</style>
