<script setup lang="ts">
import type { ProjectProperties } from '@/data/projects'

defineProps<{
  project: ProjectProperties
}>()
</script>

<template>
  <div class="column cursor-pointer project-card">
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

.project-card:hover {
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
