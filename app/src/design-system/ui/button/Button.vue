<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";
import { computed } from "vue";
import { Primitive, type PrimitiveProps } from "radix-vue";
import { btnClasses, type ButtonIntent, type ButtonSurfaceVariant } from "./button-variant-classes";
import { type ButtonVariants, buttonVariants } from "./button-variants";
import { cn } from "@/design-system/utils";

interface Props extends /* @vue-ignore */ ButtonHTMLAttributes, PrimitiveProps {
  /** Surface style: flat, outline, soft, ghost, text */
  variant?: ButtonSurfaceVariant;
  /** Semantic intent: default, primary, secondary, destructive, warning */
  intent?: ButtonIntent;
  /** Apply elevated shadow (useful on outline buttons) */
  elevated?: boolean;
  /** Show active (pressed) appearance */
  active?: boolean;
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  variant: "flat",
  intent: "default",
  elevated: false,
  active: false,
});

const intentClasses = computed(() => btnClasses(props.variant, props.intent));
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        buttonVariants({ size }),
        intentClasses,
        elevated && 'srf--elevated',
        active && 'srf--active',
        props.class,
      )
    "
  >
    <slot />
  </Primitive>
</template>
