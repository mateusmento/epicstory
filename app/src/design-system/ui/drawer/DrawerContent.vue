<script lang="ts" setup>
import type { DialogContentEmits, DialogContentProps } from "radix-vue";
import type { HtmlHTMLAttributes } from "vue";
import { cn } from "@/design-system/utils";
import { useForwardPropsEmits } from "radix-vue";
import { DrawerContent, DrawerPortal } from "vaul-vue";
import DrawerOverlay from "./DrawerOverlay.vue";

const props = defineProps<DialogContentProps & { class?: HtmlHTMLAttributes["class"] }>();
const emits = defineEmits<DialogContentEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerContent v-bind="forwarded" :class="cn(
      // Panel above overlay (z-[55]) and above general popovers (z-50)
      'fixed inset-y-0 right-0 z-[60] flex h-auto flex-col [&::after]:hidden rounded-xl border bg-background',
      props.class,
    )
      ">
      <!-- <div class="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" /> -->
      <slot />
    </DrawerContent>
  </DrawerPortal>
</template>
