<script setup lang="ts">
import type { ContextMenuSeparatorProps, DropdownMenuSeparatorProps } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuSeparator, ContextMenuSeparator } from "reka-ui";
import { useResolvedMenuImplementation } from "./_shared";
import { cn } from "@/design-system/utils";

type MenuSeparatorProps = DropdownMenuSeparatorProps &
  ContextMenuSeparatorProps & { class?: HTMLAttributes["class"] };

const props = defineProps<MenuSeparatorProps>();

const delegatedProps = reactiveOmit(props, "class");

const impl = useResolvedMenuImplementation();

const separatorComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuSeparator : ContextMenuSeparator,
);
</script>

<template>
  <component
    :is="separatorComponent"
    v-bind="delegatedProps"
    :class="cn('menu-separator -mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>
