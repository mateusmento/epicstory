<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { reactiveOmit } from "@vueuse/core";
import { ChevronRight } from "lucide-vue-next";
import type { ContextMenuSubTriggerProps, DropdownMenuSubTriggerProps } from "reka-ui";
import { ContextMenuSubTrigger, DropdownMenuSubTrigger, useForwardProps } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { useResolvedMenuImplementation } from "./_shared";

const props = defineProps<
  DropdownMenuSubTriggerProps &
    ContextMenuSubTriggerProps & { class?: HTMLAttributes["class"]; inset?: boolean }
>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);

const impl = useResolvedMenuImplementation();

const subTriggerComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuSubTrigger : ContextMenuSubTrigger,
);
</script>

<template>
  <component
    :is="subTriggerComponent"
    v-bind="forwardedProps"
    :class="
      cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        inset && 'pl-8',
        props.class,
      )
    "
  >
    <slot />
    <ChevronRight class="ml-auto h-4 w-4" />
  </component>
</template>
