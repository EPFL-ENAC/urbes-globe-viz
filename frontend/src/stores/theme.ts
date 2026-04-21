import { defineStore } from "pinia";
import { computed, ref, watch, type App } from "vue";
import { Dark } from "quasar";

export type ThemeMode = "light" | "dark";
export type ThemeOverride = ThemeMode | null;

const STORAGE_KEY = "urbes:theme";
// Dark is the app's identity — we ignore `prefers-color-scheme` and only
// switch to light when the user explicitly toggles.
const DEFAULT_MODE: ThemeMode = "dark";

function readOverride(): ThemeOverride {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

export const useThemeStore = defineStore("theme", () => {
  const override = ref<ThemeOverride>(readOverride());

  const mode = computed<ThemeMode>(() => override.value ?? DEFAULT_MODE);

  function set(next: ThemeMode) {
    override.value = next;
  }

  function clearOverride() {
    override.value = null;
  }

  function toggle() {
    override.value = mode.value === "dark" ? "light" : "dark";
  }

  // Persist override changes.
  watch(override, (next) => {
    try {
      if (next === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  });

  return { override, mode, set, clearOverride, toggle };
});

/**
 * Wire the theme store to `<html data-theme="...">` and Quasar's Dark plugin.
 * Must run after Pinia is installed on the app so the store is usable.
 */
export function installTheme(_app: App) {
  const store = useThemeStore();

  const apply = (m: ThemeMode) => {
    document.documentElement.setAttribute("data-theme", m);
    Dark.set(m === "dark");
  };

  apply(store.mode);
  watch(
    () => store.mode,
    (m) => apply(m),
  );
}
