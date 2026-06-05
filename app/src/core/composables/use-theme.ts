import { useColorMode } from "@vueuse/core";
import type { Component } from "vue";
import { computed, watch } from "vue";
import { Monitor, Moon, Sun } from "lucide-vue-next";

import { syncHighlightTheme, mountHighlightThemes } from "./theme-highlight";

export const THEME_STORAGE_KEY = "epicstory-color-scheme";

export type ThemePreference = "light" | "dark" | "auto";

export const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: Component;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "auto", label: "System", icon: Monitor },
];

function syncNativeColorScheme(isDark: boolean) {
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function useTheme() {
  const preference = useColorMode({
    attribute: "class",
    modes: {
      light: "",
      dark: "dark",
    },
    storageKey: THEME_STORAGE_KEY,
    initialValue: "auto",
  });

  const resolved = computed<"light" | "dark">(() => {
    if (preference.value === "dark") return "dark";
    if (preference.value === "light") return "light";
    return preference.system.value === "dark" ? "dark" : "light";
  });

  const isDark = computed(() => resolved.value === "dark");

  watch(
    isDark,
    (dark) => {
      syncNativeColorScheme(dark);
      syncHighlightTheme(dark);
    },
    { immediate: true },
  );

  return {
    preference,
    resolved,
    isDark,
  };
}

export function initTheme() {
  mountHighlightThemes();
  useTheme();
}
