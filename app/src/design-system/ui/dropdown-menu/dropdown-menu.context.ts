import { computed, inject, provide, shallowRef, type ComputedRef, type ShallowRef } from "vue";

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

export function useDropdownMenuZContext() {
  return inject<DropdownMenuZContext | null>(DROPDOWN_MENU_Z_CONTEXT, null);
}

