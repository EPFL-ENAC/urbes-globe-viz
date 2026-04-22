import { onBeforeUnmount, onMounted, ref } from "vue";

const MOBILE_QUERY = "(max-width: 767px)";
// Project detail collapses to bottom-sheet UI at tablet width: the 50vw
// drawer + map split is too cramped below a laptop.
const COMPACT_PROJECT_QUERY = "(max-width: 1023px)";

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
