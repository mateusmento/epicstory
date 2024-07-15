<script setup lang="ts">
import { CollapsibleContent, type CollapsibleContentProps } from "radix-vue";
import { omit } from "lodash";
type Props = CollapsibleContentProps & { transition?: "vertical" | "fade" | "none" };

const props = withDefaults(defineProps<Props>(), {
  transition: "vertical",
});
</script>

<template>
  <CollapsibleContent
    v-bind="omit(props, ['direction'])"
    class="overflow-hidden transition-all"
    :class="{
      'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down':
        transition === 'vertical',
      'data-[state=open]:animate-collapsible-fadein data-[state=closed]:animate-collapsible-fadeout':
        transition === 'fade',
    }"
  >
    <slot />
  </CollapsibleContent>
</template>
