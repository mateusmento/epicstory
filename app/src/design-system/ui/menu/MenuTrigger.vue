<script setup lang="ts">
import type { ContextMenuTriggerProps, DropdownMenuTriggerProps } from "reka-ui";
import { ContextMenuTrigger, DropdownMenuTrigger, useForwardProps } from "reka-ui";
import { computed, onMounted, ref, watchEffect } from "vue";
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
</script>

<template>
  <component :is="implComponent" class="outline-none" v-bind="forwardedProps" ref="triggerRef">
    <slot />
  </component>
</template>
