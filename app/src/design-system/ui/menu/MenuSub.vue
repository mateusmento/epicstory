<script setup lang="ts">
import type {
  ContextMenuSubEmits,
  ContextMenuSubProps,
  DropdownMenuSubEmits,
  DropdownMenuSubProps,
} from "reka-ui";
import { ContextMenuSub, DropdownMenuSub, useForwardPropsEmits } from "reka-ui";
import { useResolvedMenuImplementation } from "./_shared";
import { computed } from "vue";

type MenuSubProps = DropdownMenuSubProps & ContextMenuSubProps;
type MenuSubEmits = DropdownMenuSubEmits & ContextMenuSubEmits;

const props = defineProps<MenuSubProps>();
const emits = defineEmits<MenuSubEmits>();

const forwarded = useForwardPropsEmits(props, emits);

const impl = useResolvedMenuImplementation();

const subComponent = computed(() => (impl.value === "dropdown-menu" ? DropdownMenuSub : ContextMenuSub));
</script>

<template>
  <component :is="subComponent" v-bind="forwarded">
    <slot />
  </component>
</template>
