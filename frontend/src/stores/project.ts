import { defineStore } from "pinia";
import { ref } from "vue";

export const useProjectStore = defineStore("project", () => {
  const selectedProject = ref<string | null>(null);
  const hoveredProjectId = ref<string | null>(null);

  function selectProject(id: string) {
    selectedProject.value = id;
  }

  function setHoveredProject(id: string | null) {
    hoveredProjectId.value = id;
  }

  return {
    selectedProject,
    hoveredProjectId,
    selectProject,
    setHoveredProject,
  };
});
