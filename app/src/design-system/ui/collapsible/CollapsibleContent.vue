<script setup lang="ts">
import { CollapsibleContent, type CollapsibleContentProps } from "radix-vue";

type Props = CollapsibleContentProps & { transition?: "vertical" | "horizontal" };

const props = withDefaults(defineProps<Props>(), {
  transition: "vertical",
});
</script>

<template>
  <CollapsibleContent
    v-bind="props"
    class="overflow-hidden"
    :class="{
      'data-[state=open]:animate-collapsible-vertically-show data-[state=closed]:animate-collapsible-vertically-hide':
        transition === 'vertical',
      'data-[state=open]:animate-collapsible-horizontally-show data-[state=closed]:animate-collapsible-horizontally-hide':
        transition === 'horizontal',
    }"
  >
    <slot />
  </CollapsibleContent>
</template>
