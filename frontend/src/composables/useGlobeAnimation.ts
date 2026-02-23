import { ref, onUnmounted } from "vue";
import type maplibregl from "maplibre-gl";

export function useGlobeAnimation(map: () => maplibregl.Map | null) {
  let animationFrame: number | null = null;
  let isUserInteracting = ref(true);
  let interactionTimeout: number | null = null;
  const isHoveringProject = ref(false);
  let lastAnimationTime = 0;
  const ANIMATION_THROTTLE = 10; // ms between animation frames

  const startInteraction = () => {
    isUserInteracting.value = true;
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
    }
  };

  const endInteraction = () => {
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
    }
  };

  const setupInteractionTracking = () => {
    const mapInstance = map();
    if (!mapInstance) return;

    mapInstance.on("dragstart", startInteraction);
    mapInstance.on("zoomstart", startInteraction);
    mapInstance.on("pitchstart", startInteraction);
    mapInstance.on("rotatestart", startInteraction);
    mapInstance.on("mousedown", startInteraction);
    mapInstance.on("mouseup", endInteraction);
    mapInstance.on("dragend", endInteraction);
    mapInstance.on("zoomend", endInteraction);
    mapInstance.on("pitchend", endInteraction);
    mapInstance.on("rotateend", endInteraction);
  };

  const startAnimation = () => {
    const animate = (timestamp: number) => {
      const mapInstance = map();
      if (!isUserInteracting.value && !isHoveringProject.value && mapInstance) {
        // Throttle animation to reduce CPU usage
        if (timestamp - lastAnimationTime >= ANIMATION_THROTTLE) {
          const center = mapInstance.getCenter();
          mapInstance.setCenter([center.lng + 0.05, center.lat]);
          lastAnimationTime = timestamp;
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
  };

  const cleanup = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
      interactionTimeout = null;
    }
  };

  onUnmounted(cleanup);

  return {
    isHoveringProject,
    setupInteractionTracking,
    startAnimation,
    cleanup,
  };
}
