<script setup lang="ts">
import type {
  ContextMenuRadioGroupEmits,
  ContextMenuRadioGroupProps,
  DropdownMenuRadioGroupEmits,
  DropdownMenuRadioGroupProps,
} from "reka-ui";
import { ContextMenuRadioGroup, DropdownMenuRadioGroup, useForwardPropsEmits } from "reka-ui";
import { useResolvedMenuImplementation } from "./_shared";
import { computed } from "vue";

const props = defineProps<DropdownMenuRadioGroupProps & ContextMenuRadioGroupProps>();
const emits = defineEmits<DropdownMenuRadioGroupEmits & ContextMenuRadioGroupEmits>();

const forwarded = useForwardPropsEmits(props, emits);

const impl = useResolvedMenuImplementation();

const radioGroupComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuRadioGroup : ContextMenuRadioGroup,
);
</script>

<template>
  <component :is="radioGroupComponent" v-bind="forwarded">
    <slot />
  </component>
</template>
