<script setup lang="ts">
import type { ContextMenuGroupProps, DropdownMenuGroupProps } from "reka-ui";
import { ContextMenuGroup, DropdownMenuGroup } from "reka-ui";
import { useResolvedMenuImplementation } from "./_shared";
import { computed } from "vue";

type MenuGroupProps = DropdownMenuGroupProps & ContextMenuGroupProps;
const props = defineProps<MenuGroupProps>();

const impl = useResolvedMenuImplementation();

const groupComponent = computed(() =>
  impl.value === "dropdown-menu" ? DropdownMenuGroup : ContextMenuGroup,
);
</script>

<template>
  <component :is="groupComponent" v-bind="props">
    <slot />
  </component>
</template>
