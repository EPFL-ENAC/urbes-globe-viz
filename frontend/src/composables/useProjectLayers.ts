import { ref, watch } from "vue";
import type maplibregl from "maplibre-gl";
import { mapLayers } from "@/config/projects";
import { useProjectStore } from "@/stores/project";

export function useProjectLayers(map: () => maplibregl.Map | null) {
  const projectStore = useProjectStore();
  const loadingProjectId = ref<string | null>(null);
  const activeSourceDataListeners = new Map<string, (e: any) => void>();

  const removePreviewLayer = (projectId: string) => {
    const mapInstance = map();
    if (!mapInstance) return;

    console.log("Removing preview layer:", projectId);

    // Remove event listener if exists
    const listener = activeSourceDataListeners.get(projectId);
    if (listener) {
      mapInstance.off("sourcedata", listener);
      activeSourceDataListeners.delete(projectId);
    }

    const layerId = `${projectId}-preview`;
    if (mapInstance.getLayer(layerId)) {
      mapInstance.removeLayer(layerId);
    }
    if (mapInstance.getSource(projectId)) {
      mapInstance.removeSource(projectId);
    }
  };

  const removeAllPreviewLayers = () => {
    const mapInstance = map();
    if (!mapInstance) return;

    console.log("Removing all preview layers");
    const allProjectIds = mapLayers.map((l) => l.id);
    allProjectIds.forEach((projectId) => {
      removePreviewLayer(projectId);
    });
  };

  const updateCircleVisibility = () => {
    const mapInstance = map();
    if (!mapInstance || !mapInstance.getLayer("project-circles")) {
      console.log("Cannot update visibility - map or layer not ready");
      return;
    }

    if (projectStore.hoveredProjectId) {
      console.log("Showing only project:", projectStore.hoveredProjectId);
      mapInstance.setFilter("project-circles", [
        "==",
        ["get", "id"],
        projectStore.hoveredProjectId,
      ]);
    } else {
      console.log("Showing all circles");
      mapInstance.setFilter("project-circles", null);
    }
  };

  const addPreviewLayer = (projectId: string) => {
    const mapInstance = map();
    if (!mapInstance) return;

    const layerConfig = mapLayers.find((l) => l.id === projectId);
    if (layerConfig) {
      console.log("Adding preview for:", projectId);

      // Add source if it doesn't exist
      if (!mapInstance.getSource(projectId)) {
        console.log("Adding source:", projectId, layerConfig.source);
        mapInstance.addSource(projectId, layerConfig.source);
      }

      // Add layer with preview styling
      const previewLayer = {
        ...layerConfig.layer,
        id: `${projectId}-preview`,
        source: projectId,
      };

      // Add layer before project circles to maintain proper z-ordering
      try {
        console.log("Adding layer:", previewLayer);
        mapInstance.addLayer(previewLayer, "project-circles");

        // Listen for when the source data is loaded
        const onSourceData = (e: any) => {
          if (e.sourceId === projectId && e.isSourceLoaded && mapInstance) {
            console.log("Source loaded:", projectId);

            // Check if this project is still the one being loaded
            if (loadingProjectId.value === projectId) {
              loadingProjectId.value = null;
              updateCircleVisibility();
            }

            // Clean up listener
            mapInstance.off("sourcedata", onSourceData);
            activeSourceDataListeners.delete(projectId);
          }
        };

        // Store the listener so we can remove it later if needed
        activeSourceDataListeners.set(projectId, onSourceData);
        mapInstance.on("sourcedata", onSourceData);
      } catch (e) {
        console.error("Error adding preview layer:", e);
        loadingProjectId.value = null;
        updateCircleVisibility();
      }
    } else {
      console.warn("No layer config found for:", projectId);
      loadingProjectId.value = null;
      updateCircleVisibility();
    }
  };

  // Watch for hovered project changes
  watch(
    () => projectStore.hoveredProjectId,
    (projectId, oldProjectId) => {
      const mapInstance = map();
      console.log("Hovered project changed:", oldProjectId, "->", projectId);

      if (!mapInstance) {
        console.log("Map not initialized");
        return;
      }

      // Check if map style is loaded
      if (!mapInstance.isStyleLoaded()) {
        console.log("Style not loaded, queuing for later");
        mapInstance.once("styledata", () => {
          if (projectId && projectStore.hoveredProjectId === projectId) {
            loadingProjectId.value = projectId;
            updateCircleVisibility();
            addPreviewLayer(projectId);
          }
        });
        return;
      }

      // Remove old layer if exists
      if (oldProjectId && oldProjectId !== projectId) {
        removePreviewLayer(oldProjectId);
      }

      // Add new layer if project is hovered
      if (projectId) {
        loadingProjectId.value = projectId;
        updateCircleVisibility();
        addPreviewLayer(projectId);
      } else {
        // Clean up ALL preview layers when no project is hovered
        loadingProjectId.value = null;
        removeAllPreviewLayers();
        updateCircleVisibility();
      }
    },
  );

  const cleanup = () => {
    activeSourceDataListeners.clear();
  };

  return {
    loadingProjectId,
    cleanup,
  };
}
