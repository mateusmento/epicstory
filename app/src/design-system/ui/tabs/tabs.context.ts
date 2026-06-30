import { type ComputedRef, type InjectionKey, type Ref, computed, inject, provide } from "vue";

export type TabValue = string | number;

export type TabContext = {
  modelValue: Ref<TabValue | undefined> | ComputedRef<TabValue | undefined>;
};

export const TAB_CONTEXT: InjectionKey<TabContext> = Symbol("TabContext");

export function provideTabContext(modelValue: TabContext["modelValue"]): void {
  provide(TAB_CONTEXT, { modelValue });
}

export function useTabActive(value: TabValue) {
  const ctx = inject(TAB_CONTEXT, null);
  return computed(() => ctx?.modelValue.value === value);
}
