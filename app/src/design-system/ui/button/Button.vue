<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";
import { Primitive, type PrimitiveProps } from "radix-vue";
import { type ButtonVariants, buttonVariants } from ".";
import { cn } from "@/design-system/utils";

export type ButtonVariant = "default" | "primary" | "invitational";
export type ButtonSize = "th" | "sm" | "md" | "lg" | "xl";

interface Props extends /* @vue-ignore */ ButtonHTMLAttributes, PrimitiveProps {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
  title?: string;
  legacy?: boolean;
  legacyVariant?: ButtonVariant;
  legacySize?: ButtonSize;
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  legacyVariant: "default",
  legacySize: "md",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      legacy
        ? cn(['button', `button--${props.legacyVariant}`, `button--${props.legacySize}`], props.class)
        : cn(buttonVariants({ variant, size }), props.class)
    "
  >
    <slot>{{ title }}</slot>
  </Primitive>
</template>

<style scoped>
.button {
  /* font-weight: 500; */
  border-color: var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-color);

  transition:
    box-shadow 50ms,
    background-color 100ms;

  &:hover {
    background-color: var(--hover-color);
  }
}

.button--th {
  padding: 4px 8px;
  border-radius: 4px;
  /* font-size: 0.8rem; */
  outline-width: 1px;
}

.button--sm {
  padding: 6px 12px;
  border-radius: 6px;
  /* font-size: 0.9rem; */
  outline-width: 1px;
}

.button--md {
  padding: 8px 16px;
  border-radius: 6px;
  /* font-size: 0.9rem; */
  outline-width: 1px;
}

.button--lg {
  padding: 16px 32px;
  border-radius: 10px;
  font-size: 1.1rem;
  outline-width: 2px;
}

.button--xl {
  padding: 18px 64px;
  border-radius: 10px;
  outline-width: 2px;
  font-size: 1.2rem;
}

.button--default {
  --border-color: #ccc;
  --bg-color: #fff;
  --text-color: var(--black);
  --hover-color: #f6f6f6;

  outline-color: #dedede;
  box-shadow: 0 1px 1px #ccc;

  &:active {
    box-shadow:
      0 0px 0px #ddd,
      inset 0 2px 4px #ddd;
  }
}

.button--primary,
.button--invitational {
  --text-color: white;
  --border-color: var(--blue);
  --bg-color: var(--blue);
  --hover-color: #3734f1;

  outline-color: #c4d5ff;

  &:active {
    box-shadow: inset 0 1px 2px #0300c2;
  }

  &:is(.button--lg, .button-xl):active {
    box-shadow: inset 0 2px 4px #0300c2;
  }
}

.button--invitational {
  &:is(.button--th, .button--sm) {
    box-shadow: inset 0 0px 0px 1px #577fff;
    border: 1px solid var(--blue);
  }

  &:is(.button--md, .button--lg) {
    box-shadow: inset 0 0px 0px 2px #577fff;
    border: 1px solid var(--blue);
  }

  &.button--xl {
    box-shadow: inset 0 1px 1px 2px #3f6cff;
    border: 2px solid var(--blue);
  }

  &:active {
    box-shadow: inset 0 1px 2px #0300c2;
  }

  &:is(.button--lg, .button--xl):active {
    box-shadow: inset 0 2px 4px #0300c2;
  }
}
</style>
