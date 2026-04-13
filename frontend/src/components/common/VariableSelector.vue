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
  <div class="variable-selector">
    <button
      v-for="v in variables"
      :key="v.id"
      class="var-chip"
      :class="{ active: v.id === modelValue }"
      @click="emit('update:modelValue', v.id)"
    >
      {{ v.label }}
    </button>
  </div>
</template>

<style scoped>
.variable-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-radius: 10px;
  pointer-events: auto;
}

.var-chip {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  white-space: nowrap;
  text-align: center;
}

.var-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.var-chip.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}
</style>
