<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { reactiveOmit } from "@vueuse/core";
import { Check } from "lucide-vue-next";
import type {
  ContextMenuCheckboxItemEmits,
  ContextMenuCheckboxItemProps,
  DropdownMenuCheckboxItemEmits,
  DropdownMenuCheckboxItemProps,
} from "reka-ui";
import {
  ContextMenuCheckboxItem,
  DropdownMenuCheckboxItem,
  DropdownMenuItemIndicator,
  ContextMenuItemIndicator,
  useForwardPropsEmits,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { useResolvedMenuImplementation } from "./_shared";

type MenuCheckboxItemProps = DropdownMenuCheckboxItemProps &
  ContextMenuCheckboxItemProps & { class?: HTMLAttributes["class"] };
type MenuCheckboxItemEmits = DropdownMenuCheckboxItemEmits & ContextMenuCheckboxItemEmits;

const props = defineProps<MenuCheckboxItemProps>();
const emits = defineEmits<MenuCheckboxItemEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const impl = useResolvedMenuImplementation();

const checkboxItemComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuCheckboxItem : ContextMenuCheckboxItem,
);

const indicatorComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuItemIndicator : ContextMenuItemIndicator,
);
</script>

<template>
  <component
    :is="checkboxItemComponent"
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
          <Check class="w-4 h-4" />
        </slot>
      </component>
    </span>
    <slot />
  </component>
</template>
