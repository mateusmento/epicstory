<script setup lang="ts" generic="T extends Record<string, any>">
import { type HTMLAttributes, computed } from "vue";
import type { ComboboxItemEmits, ComboboxItemProps } from "radix-vue";
import { ComboboxItem, useForwardPropsEmits } from "radix-vue";
import { cn } from "@/design-system/utils";

const props = defineProps<ComboboxItemProps<T> & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<ComboboxItemEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ComboboxItem
    v-bind="forwarded"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </ComboboxItem>
</template>
