<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { reactiveOmit } from "@vueuse/core";
import type {
  ContextMenuItemEmits,
  ContextMenuItemProps,
  DropdownMenuItemEmits,
  DropdownMenuItemProps,
} from "reka-ui";
import { ContextMenuItem, DropdownMenuItem, useForwardPropsEmits } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import type { ButtonIntent } from "../button";
import { useResolvedMenuImplementation } from "./_shared";

type MenuItemProps = DropdownMenuItemProps &
  ContextMenuItemProps & {
    class?: HTMLAttributes["class"];
    inset?: boolean;
    intent?: ButtonIntent;
  };

type MenuItemEmits = DropdownMenuItemEmits & ContextMenuItemEmits;

const props = defineProps<MenuItemProps>();
const emit = defineEmits<MenuItemEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardPropsEmits(delegatedProps, emit);

const impl = useResolvedMenuImplementation();

const itemComponent = computed(() => (impl.value === "dropdown-menu" ? DropdownMenuItem : ContextMenuItem));
</script>

<template>
  <component
    :is="itemComponent"
    v-bind="forwardedProps"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm gap-2 px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
        inset && 'pl-8',
        props.intent === 'destructive' &&
          'text-destructive [&>svg]:text-destructive focus:bg-destructive/20 focus:text-destructive',
        props.class,
      )
    "
  >
    <slot />
  </component>
</template>
