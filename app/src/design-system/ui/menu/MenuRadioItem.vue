<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { DotFilledIcon } from "@radix-icons/vue";
import { reactiveOmit } from "@vueuse/core";
import type {
  ContextMenuRadioItemEmits,
  ContextMenuRadioItemProps,
  DropdownMenuRadioItemEmits,
  DropdownMenuRadioItemProps,
} from "reka-ui";
import {
  ContextMenuItemIndicator,
  ContextMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuRadioItem,
  useForwardPropsEmits,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { useResolvedMenuImplementation } from "./_shared";

type MenuRadioItemProps = DropdownMenuRadioItemProps &
  ContextMenuRadioItemProps & { class?: HTMLAttributes["class"] };

type MenuRadioItemEmits = DropdownMenuRadioItemEmits & ContextMenuRadioItemEmits;

const props = defineProps<MenuRadioItemProps>();
const emits = defineEmits<MenuRadioItemEmits>();
const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const impl = useResolvedMenuImplementation();

const radioItemComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuRadioItem : ContextMenuRadioItem,
);

const indicatorComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuItemIndicator : ContextMenuItemIndicator,
);
</script>

<template>
  <component
    :is="radioItemComponent"
    v-bind="forwarded"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <component :is="indicatorComponent">
        <slot name="indicator">
          <DotFilledIcon class="h-6 w-6 fill-current" />
        </slot>
      </component>
    </span>
    <slot />
  </component>
</template>
