import { defineStore } from "pinia";
import { ref } from "vue";

export const useProjectStore = defineStore("project", () => {
  const selectedProject = ref<string | null>(null);
  const hoveredProjectId = ref<string | null>(null);
  const zoomLevel = ref(2);
  // Globe3D sets this on mount based on viewport width; other components
  // (e.g. HeroSection) scale their zoom-dependent logic against it.
  const initialZoom = ref(2);
  const targetZoom = ref<number | null>(null);

  function selectProject(id: string) {
    selectedProject.value = id;
  }

  function setHoveredProject(id: string | null) {
    hoveredProjectId.value = id;
  }

  function setZoomLevel(zoom: number) {
    zoomLevel.value = zoom;
  }

  function setInitialZoom(zoom: number) {
    initialZoom.value = zoom;
  }

  function requestZoom(zoom: number) {
    targetZoom.value = zoom;
  }

  return {
    selectedProject,
    hoveredProjectId,
    zoomLevel,
    initialZoom,
    targetZoom,
    selectProject,
    setHoveredProject,
    setZoomLevel,
    setInitialZoom,
    requestZoom,
  };
});
