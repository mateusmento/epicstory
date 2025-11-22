<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { DropdownMenuItem, type DropdownMenuItemProps, useForwardProps } from "radix-vue";
import { computed, type HTMLAttributes } from "vue";
import { type ButtonVariants } from "../button";

const props = defineProps<
  DropdownMenuItemProps & {
    class?: HTMLAttributes["class"];
    inset?: boolean;
    variant?: ButtonVariants["variant"];
  }
>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuItem
    v-bind="forwardedProps"
    :class="
      cn(
        'relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors cursor-pointer',
        'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        props.variant === 'destructive' &&
          'text-destructive hover:text-destructive data-[highlighted]:bg-destructive/20 data-[highlighted]:text-destructive',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
