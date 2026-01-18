import { defineStore } from "pinia";
import { ref } from "vue";

export const useProjectStore = defineStore("project", () => {
  const selectedProject = ref<string | null>(null);

  function selectProject(id: string) {
    selectedProject.value = id;
  }

  return {
    selectedProject,
    selectProject,
  };
});
