import { defineStore } from "pinia";
import { ref } from "vue";

export const useProjectStore = defineStore("project", () => {
  const selectedProject = ref<string | null>(null);
  const targetCoordinates = ref<{ longitude: number; latitude: number } | null>(
    null,
  );
  const hoveredProjectId = ref<string | null>(null);

  function selectProject(id: string) {
    selectedProject.value = id;
  }

  function setTargetCoordinates(longitude: number, latitude: number) {
    targetCoordinates.value = { longitude, latitude };
  }

  function clearTargetCoordinates() {
    targetCoordinates.value = null;
  }

  function setHoveredProject(id: string | null) {
    hoveredProjectId.value = id;
  }

  return {
    selectedProject,
    targetCoordinates,
    hoveredProjectId,
    selectProject,
    setTargetCoordinates,
    clearTargetCoordinates,
    setHoveredProject,
  };
});
