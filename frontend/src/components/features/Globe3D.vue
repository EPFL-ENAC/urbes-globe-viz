<script setup lang="ts">
import { onMounted, ref } from "vue";

const container = ref<HTMLDivElement | null>(null);

onMounted(() => {
  // Initialize DeckGL here
  console.log("Globe3D mounted");
});
</script>

<template>
  <div ref="container" class="globe-container">
    <!-- DeckGL canvas will be injected here -->
  </div>
</template>

<style scoped>
.globe-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
