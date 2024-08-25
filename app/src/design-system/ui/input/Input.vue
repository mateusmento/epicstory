<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "vue";

export type InputVariants = VariantProps<typeof styles>;

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    size?: InputVariants["size"];
  }>(),
  {
    size: "default",
  },
);

const modelValue = defineModel<string>();

const styles = cva(
  "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 rounded px-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        badge: "py-0.5 px-1 rounded text-xs",
      },
    },
  },
);
</script>

<template>
  <input v-model="modelValue" :class="cn(styles({ size }), props.class)" />
</template>
