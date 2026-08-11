import { defineStore } from "pinia";
import { ref } from "vue";

export const useProjectStore = defineStore("project", () => {
  const selectedProject = ref<string | null>(null);
  const hoveredProjectId = ref<string | null>(null);
  const zoomLevel = ref(2);
  // Globe3D sets this on mount based on viewport width; other components
  // (e.g. HeroSection) scale their zoom-dependent logic against it.
  const initialZoom = ref(2);
  // True from the moment a card-hover preview flight starts until the globe has
  // flown all the way back out. The hero reads it so a preview never dismisses
  // the intro text - not on the way in, and not during the return flight, whose
  // zoom would otherwise briefly cross the dismiss threshold.
  const previewFlightActive = ref(false);

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

  function setPreviewFlightActive(active: boolean) {
    previewFlightActive.value = active;
  }

  return {
    selectedProject,
    hoveredProjectId,
    zoomLevel,
    initialZoom,
    previewFlightActive,
    selectProject,
    setHoveredProject,
    setZoomLevel,
    setInitialZoom,
    setPreviewFlightActive,
  };
});
