<script setup lang="ts">
import type { ContextMenuLabelProps, DropdownMenuLabelProps } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuLabel, DropdownMenuLabel, useForwardProps } from "reka-ui";
import { cn } from "@/design-system/utils";
import { useResolvedMenuImplementation } from "./_shared";

type MenuLabelProps = DropdownMenuLabelProps &
  ContextMenuLabelProps & { class?: HTMLAttributes["class"]; inset?: boolean };

const props = defineProps<MenuLabelProps>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);

const impl = useResolvedMenuImplementation();

const labelComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuLabel : ContextMenuLabel,
);
</script>

<template>
  <component
    :is="labelComponent"
    v-bind="forwardedProps"
    :class="cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', props.class)"
  >
    <slot />
  </component>
</template>
