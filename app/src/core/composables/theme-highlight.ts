import hljsDarkUrl from "highlight.js/styles/github-dark.css?url";
import hljsLightUrl from "highlight.js/styles/github.css?url";

export const HIGHLIGHT_LIGHT_ID = "hljs-theme-light";
export const HIGHLIGHT_DARK_ID = "hljs-theme-dark";

export function mountHighlightThemes() {
  if (document.getElementById(HIGHLIGHT_LIGHT_ID)) return;

  const light = document.createElement("link");
  light.id = HIGHLIGHT_LIGHT_ID;
  light.rel = "stylesheet";
  light.href = hljsLightUrl;
  document.head.appendChild(light);

  const dark = document.createElement("link");
  dark.id = HIGHLIGHT_DARK_ID;
  dark.rel = "stylesheet";
  dark.href = hljsDarkUrl;
  dark.disabled = true;
  document.head.appendChild(dark);
}

export function syncHighlightTheme(isDark: boolean) {
  document.getElementById(HIGHLIGHT_LIGHT_ID)?.toggleAttribute("disabled", isDark);
  document.getElementById(HIGHLIGHT_DARK_ID)?.toggleAttribute("disabled", !isDark);
}
