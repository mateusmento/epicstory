import { all, createLowlight } from "lowlight";

/**
 * Full highlight.js grammar set shipped by lowlight (`all` vs `common`).
 * Keeps the language menu aligned with what `highlight` / `highlightAuto` can use.
 */
export const epicStoryLowlight = createLowlight(all);

/**
 * highlight.js lists canonical names in `listLanguages()`; aliases (e.g. `vue` → `xml`) work for
 * highlighting but do not appear in that list.
 */
epicStoryLowlight.registerAlias({ xml: ["vue"] });

/** Extra names to show in pickers even when missing from `listLanguages()`. */
const MENU_EXTRA_LANGUAGE_NAMES: readonly string[] = ["vue"];

export function listLowlightLanguagesForMenu(): string[] {
  const names = new Set(epicStoryLowlight.listLanguages());
  for (const name of MENU_EXTRA_LANGUAGE_NAMES) {
    if (epicStoryLowlight.registered(name)) {
      names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
