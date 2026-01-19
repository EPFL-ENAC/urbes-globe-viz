<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
const projectId = route.params.id;
</script>

<template>
  <div class="fit flex flex-center" style="background-color: #f5f5f5">
    <h1 class="text-h4 text-grey-9">Project Detail View: {{ projectId }}</h1>
  </div>
</template>

<style scoped></style>
