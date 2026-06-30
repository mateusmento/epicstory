<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";
import { Primitive, type PrimitiveProps } from "radix-vue";
import { type ButtonColor, type ButtonSurfaceVariant } from "./button-variant-classes";
import { type ButtonVariants, buttonVariants } from "./button-variants";
import { cn } from "@/design-system/utils";

interface Props extends /* @vue-ignore */ ButtonHTMLAttributes, PrimitiveProps {
  /** Surface style: flat, outline, surface, soft, ghost, text, brand */
  variant?: ButtonSurfaceVariant;
  /** Intent color: default, primary, secondary, destructive, warning */
  color?: ButtonColor;
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  variant: "flat",
  color: "default",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :data-btn-variant="variant"
    :data-btn-color="color"
    :class="cn(buttonVariants({ size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
