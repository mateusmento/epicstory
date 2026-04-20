<script setup lang="ts">
import type { ContextMenuTriggerProps, DropdownMenuTriggerProps } from "reka-ui";
import { ContextMenuTrigger, DropdownMenuTrigger, useForwardProps } from "reka-ui";
import { computed, onMounted, ref, watchEffect } from "vue";
import { closeAllContextMenuInstances } from "./context-menu-instance-registry";
import { useResolvedMenuImplementation } from "./_shared";
import { useDropdownMenuZContext } from "./menu.context";

const props = defineProps<DropdownMenuTriggerProps & ContextMenuTriggerProps>();

const forwardedProps = useForwardProps(props);

const impl = useResolvedMenuImplementation();

const implComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuTrigger : ContextMenuTrigger,
);

const ctx = useDropdownMenuZContext();
const triggerRef = ref<any>(null);

function resolveEl(v: any): HTMLElement | null {
  const el = v?.$el ?? v;
  return el instanceof HTMLElement ? el : null;
}

onMounted(() => {
  const el = resolveEl(triggerRef.value);
  if (ctx && el) ctx.triggerEl.value = el;
});

watchEffect(() => {
  const el = resolveEl(triggerRef.value);
  if (ctx && el) ctx.triggerEl.value = el;
});

/**
 * DismissableLayer often won’t treat another row’s trigger as “outside” the open content.
 * Any primary pointer-down on a context-menu trigger closes all open context menus (then the
 * browser may open another via `contextmenu` on the same gesture for button 2).
 */
function onCapturePointerDown(e: PointerEvent) {
  if (impl.value !== "context-menu") return;
  if (e.button !== 0) return;
  closeAllContextMenuInstances();
}
</script>

<template>
  <component
    :is="implComponent"
    class="outline-none"
    v-bind="forwardedProps"
    ref="triggerRef"
    @pointerdown.capture="onCapturePointerDown"
  >
    <slot />
  </component>
</template>
