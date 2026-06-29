<script setup lang="ts">
import { RouterView } from "vue-router";
import NavigationBar from "@/components/common/NavigationBar.vue";
import { isPreviewMode } from "@/utils/previewMode";

// Page backgrounds live on :root (html) and, via Quasar's dark theme, on body.
// Drop both in preview mode so the data-only screenshots (Playwright
// `omitBackground`) come out transparent.
if (isPreviewMode && typeof document !== "undefined") {
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
}
</script>

<template>
  <NavigationBar v-if="!isPreviewMode" />
  <RouterView />
</template>

<style>
/* Global reset or minimal styles */
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: "Inter", sans-serif;
}
</style>
