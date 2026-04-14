<script setup lang="ts">
import Globe3D from "@/components/features/Globe3D.vue";
import HeroSection from "@/components/features/HeroSection.vue";
import ProjectCard from "@/components/common/ProjectCard.vue";
import { projectsGeoJSON } from "@/config/projects";
</script>

<template>
  <div class="relative bg-black overflow-hidden" style="height: 100vh">
    <Globe3D />
    <div
      class="absolute-full column no-wrap justify-end"
      style="z-index: 100; pointer-events: none"
    >
      <HeroSection />
      <div class="full-width q-pa-md" style="pointer-events: auto">
        <div
          class="row q-gutter-md no-wrap justify-center overflow-auto"
          style="scrollbar-width: none; -ms-overflow-style: none"
        >
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
.overflow-auto::-webkit-scrollbar {
  display: none;
}
</style>
