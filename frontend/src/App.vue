<script setup lang="ts">
import { RouterView } from "vue-router";
import NavigationBar from "@/components/common/NavigationBar.vue";
</script>

<template>
  <NavigationBar />
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
