import type { ComponentPublicInstance } from "vue";

/** Resolve a template ref to a measurable HTMLElement (native node or component root). */
export function resolveOverflowElement(value: unknown): HTMLElement | null {
  if (value instanceof HTMLElement) return value;
  if (value && typeof value === "object" && "$el" in value) {
    const el = (value as ComponentPublicInstance).$el;
    return el instanceof HTMLElement ? el : null;
  }
  return null;
}
