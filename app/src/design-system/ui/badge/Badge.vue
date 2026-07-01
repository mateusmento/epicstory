<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { badgeClasses, type BadgeIntent, type BadgeSurfaceVariant } from "./badge-variant-classes";
import { type BadgeVariants, badgeVariants } from ".";
import { cn } from "@/design-system/utils";

const props = withDefaults(
  defineProps<{
    /** Surface style: flat, outline, soft, ghost, text */
    variant?: BadgeSurfaceVariant;
    /** Semantic intent: default, primary, secondary, destructive, warning, success */
    intent?: BadgeIntent;
    size?: BadgeVariants["size"];
    class?: HTMLAttributes["class"];
  }>(),
  {
    variant: "soft",
    intent: "secondary",
  },
);

const surfaceClasses = computed(() => badgeClasses(props.variant, props.intent));
</script>

<template>
  <div :class="cn(badgeVariants({ size }), surfaceClasses, props.class)">
    <slot />
  </div>
</template>
