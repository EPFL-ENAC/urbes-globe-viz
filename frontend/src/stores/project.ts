import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

export const useProjectStore = defineStore("project", () => {
  const selectedProject = ref<string | null>(null);
  const mapInstance = shallowRef<maplibregl.Map | null>(null);
  const targetCoordinates = ref<{ longitude: number; latitude: number } | null>(
    null,
  );
  const hoveredProjectId = ref<string | null>(null);
  const zoomLevel = ref(2);

  function selectProject(id: string) {
    selectedProject.value = id;
  }

  function setHoveredProject(id: string | null) {
    hoveredProjectId.value = id;
  }

  function setZoomLevel(zoom: number) {
    zoomLevel.value = zoom;
  }

  function setMapInstance(map: maplibregl.Map | null) {
    mapInstance.value = map;
  }

  return {
    selectedProject,
    hoveredProjectId,
    zoomLevel,
    mapInstance,
    selectProject,
    setHoveredProject,
    setZoomLevel,
    setMapInstance,
  };
});
