import { onBeforeUnmount, onMounted, ref } from "vue";

const MOBILE_QUERY = "(max-width: 767px)";
// Project detail collapses to bottom-sheet UI at tablet width: the 50vw
// drawer + map split is too cramped below a laptop.
const COMPACT_PROJECT_QUERY = "(max-width: 1023px)";
// Landing page "compact desktop": narrow OR short desktop viewports — small
// laptops, and any monitor under heavy display/browser scaling (a 1080p screen
// at 150% is a 1280x~620 viewport). The full-size hero + card strip no longer
// fit above each other there and the centred globe sits under the hero text,
// so the type and thumbnails shrink (HeroSection.vue, GlobeView.vue) and
// Globe3D pads the sphere to the right of the text. The CSS media blocks
// repeat this query verbatim (custom properties can't hold media queries) —
// keep them in sync.
const COMPACT_LANDING_QUERY =
  "(min-width: 768px) and (max-width: 1280px), (min-width: 768px) and (max-height: 800px)";

function useMediaQuery(query: string) {
  const mql = typeof window !== "undefined" ? window.matchMedia(query) : null;
  const matches = ref(mql ? mql.matches : false);

  const onChange = (e: MediaQueryListEvent) => {
    matches.value = e.matches;
  };

  onMounted(() => {
    mql?.addEventListener("change", onChange);
  });

  onBeforeUnmount(() => {
    mql?.removeEventListener("change", onChange);
  });

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

export function useIsCompactProject() {
  return useMediaQuery(COMPACT_PROJECT_QUERY);
}

export function useIsCompactLanding() {
  return useMediaQuery(COMPACT_LANDING_QUERY);
}
