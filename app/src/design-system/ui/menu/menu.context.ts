import { computed, inject, provide, shallowRef, type ComputedRef, type ShallowRef } from "vue";

export function useDropdownMenuZContext() {
  return inject<DropdownMenuZContext | null>(DROPDOWN_MENU_Z_CONTEXT, null);
}

export type MenuImplementation = "context-menu" | "dropdown-menu";

const MENU_IMPLEMENTATION = Symbol("MenuImplementation");

export function provideMenuImplementation(impl: MenuImplementation) {
  provide(MENU_IMPLEMENTATION, impl);
}

export function useMenuImplementation() {
  return inject<MenuImplementation | null>(MENU_IMPLEMENTATION, null);
}

type DropdownMenuZContext = {
  triggerEl: ShallowRef<HTMLElement | null>;
  isInsideDrawer: ComputedRef<boolean>;
};

const DROPDOWN_MENU_Z_CONTEXT = Symbol("DropdownMenuZContext");

export function provideDropdownMenuZContext() {
  const triggerEl = shallowRef<HTMLElement | null>(null);
  const isInsideDrawer = computed(() => !!triggerEl.value?.closest?.("[vaul-drawer]"));
  const ctx: DropdownMenuZContext = { triggerEl, isInsideDrawer };
  provide(DROPDOWN_MENU_Z_CONTEXT, ctx);
  return ctx;
}
