import { computed, useAttrs } from "vue";
import { useMenuImplementation } from "./menu.context";

export function useResolvedMenuImplementation() {
  const impl = useMenuImplementation();

  if (!impl && typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[Menu] No MenuImplementation provided; defaulting to dropdown-menu.");
  }

  return computed(() => impl ?? "dropdown-menu");
}

export function useAttrsWithoutClass() {
  const attrs = useAttrs();
  return computed(() => {
    const rest = { ...(attrs as any) };
    delete rest.class;
    return rest;
  });
}
