<script setup lang="ts">
import type { CogVariableConfig } from "@/config/projects/types";

defineProps<{
  variables: CogVariableConfig[];
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <!-- `map-chip-list` is on the root so the parent can flip the list to a row
       (`map-chip-list--row`) via attribute fallthrough when the map goes full
       width — no extra prop needed. -->
  <div class="variable-selector map-control map-chip-list">
    <button
      v-for="v in variables"
      :key="v.id"
      class="map-chip"
      :class="{ active: v.id === modelValue }"
      @click="emit('update:modelValue', v.id)"
    >
      {{ v.label }}
    </button>
  </div>
</template>

<style scoped>
/* Surface, chip and list styling come from the shared .map-control /
   .map-chip-list / .map-chip primitives in style.css. */
.variable-selector {
  padding: 10px 12px;
  pointer-events: auto;
}
</style>
