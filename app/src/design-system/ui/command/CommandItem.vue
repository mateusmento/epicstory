<script setup lang="ts" generic="T extends AcceptableValue = string">
import { type HTMLAttributes, computed } from "vue";
import type { ComboboxItemEmits, ComboboxItemProps } from "radix-vue";
import { ComboboxItem, useForwardPropsEmits } from "radix-vue";
import { cn } from "@/design-system/utils";
import type { AcceptableValue } from "reka-ui";

const props = defineProps<ComboboxItemProps<T> & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<ComboboxItemEmits<T>>();

const delegatedProps = computed(() => {
  const delegated = { ...props } as typeof props & { class?: unknown };
  delete delegated.class;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ComboboxItem v-bind="forwarded" :class="cn(
    'relative flex:row-md flex:center-y cursor-default select-none rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    `[&_svg:not([class*='size-'])]:size-4`,
    props.class,
  )
    ">
    <slot />
  </ComboboxItem>
</template>
