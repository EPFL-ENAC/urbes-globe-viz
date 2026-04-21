import { computed } from "vue";
import { useThemeStore } from "@/stores/theme";

// Shared axis / tooltip palette for ECharts descriptions.
// Returns a reactive object that flips with the global theme store.
// Line/bar colors stay up to each chart (they encode data, not chrome).
//
// Values mirror the CSS variables defined in `frontend/src/style.css`
// (--color-text, --color-border, --color-border-strong, --color-surface-raised).
// Keep in sync if those change.
export function useChartTheme() {
  const theme = useThemeStore();
  return computed(() => {
    const dark = theme.mode === "dark";
    return {
      // Full-strength text to match the rest of the description copy.
      axis: dark ? "#ffffff" : "#111111",
      splitLine: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      tooltipBg: dark ? "#1a1a1a" : "#f5f5f5",
      tooltipText: dark ? "#ffffff" : "#111111",
      tooltipBorder: dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
    };
  });
}
