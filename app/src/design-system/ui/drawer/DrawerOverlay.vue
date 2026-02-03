<script lang="ts" setup>
import type { DialogOverlayProps } from "radix-vue";
import { cn } from "@/design-system/utils";
import { DrawerOverlay } from "vaul-vue";
import { computed, type HtmlHTMLAttributes } from "vue";

const props = defineProps<DialogOverlayProps & { class?: HtmlHTMLAttributes["class"] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <!-- Overlay should sit above page content (including portaled popovers), but below the drawer panel. -->
  <DrawerOverlay v-bind="delegatedProps" :class="cn('fixed inset-0 z-[55] bg-zinc-800/40', props.class)" />
</template>
