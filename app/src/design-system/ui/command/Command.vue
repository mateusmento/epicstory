<script setup lang="ts" generic="T extends string | number | boolean | Record<string, any> = string">
import { type HTMLAttributes, computed } from "vue";
import type { ComboboxRootEmits, ComboboxRootProps } from "radix-vue";
import { ComboboxRoot, useForwardPropsEmits } from "radix-vue";
import { cn } from "@/design-system/utils";

const props = withDefaults(defineProps<ComboboxRootProps<T> & { class?: HTMLAttributes["class"] }>(), {
  open: true,
});

const emits = defineEmits<ComboboxRootEmits<T>>();

const delegatedProps = computed(() => {
  const delegated = { ...props } as typeof props & { class?: unknown };
  delete delegated.class;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ComboboxRoot
    v-bind="forwarded"
    :class="
      cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        props.class,
      )
    "
  >
    <slot />
  </ComboboxRoot>
</template>
