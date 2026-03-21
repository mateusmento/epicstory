<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { reactiveOmit } from "@vueuse/core";
import type {
  ContextMenuSubContentEmits,
  ContextMenuSubContentProps,
  DropdownMenuSubContentEmits,
  DropdownMenuSubContentProps,
} from "reka-ui";
import { ContextMenuSubContent, DropdownMenuSubContent, useForwardPropsEmits } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { useResolvedMenuImplementation } from "./_shared";

type MenuSubContentProps = DropdownMenuSubContentProps &
  ContextMenuSubContentProps & { class?: HTMLAttributes["class"] };
type MenuSubContentEmits = DropdownMenuSubContentEmits & ContextMenuSubContentEmits;

const props = defineProps<MenuSubContentProps>();
const emits = defineEmits<MenuSubContentEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const impl = useResolvedMenuImplementation();

const subContentComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuSubContent : ContextMenuSubContent,
);
</script>

<template>
  <component
    :is="subContentComponent"
    v-bind="forwarded"
    :class="
      cn(
        'z-50 min-w-32 p-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        props.class,
      )
    "
  >
    <slot />
  </component>
</template>
