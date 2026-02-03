<script setup lang="ts">
import { DropdownMenuTrigger, type DropdownMenuTriggerProps, useForwardProps } from "radix-vue";
import { onMounted, ref, watchEffect } from "vue";
import { useDropdownMenuZContext } from "./dropdown-menu.context";

const props = defineProps<DropdownMenuTriggerProps>();

const forwardedProps = useForwardProps(props);

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
  <DropdownMenuTrigger ref="triggerRef" class="outline-none" v-bind="forwardedProps">
    <slot />
  </DropdownMenuTrigger>
</template>
