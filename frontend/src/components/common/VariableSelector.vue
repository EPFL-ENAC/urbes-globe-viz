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
  background: var(--color-surface);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-radius: 10px;
  pointer-events: auto;
}

.var-chip {
  padding: 4px 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: 14px;
  background: transparent;
  color: var(--color-text-muted);
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
  background: var(--color-border);
  color: var(--color-text);
}

.var-chip.active {
  background: var(--color-border-strong);
  border-color: var(--color-text);
  color: var(--color-text);
}
</style>
