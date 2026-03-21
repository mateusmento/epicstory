<script setup lang="ts">
import type {
  ContextMenuRootEmits,
  ContextMenuRootProps,
  DropdownMenuRootEmits,
  DropdownMenuRootProps,
} from "reka-ui";
import { ContextMenuRoot, DropdownMenuRoot, useForwardPropsEmits } from "reka-ui";
import { provideMenuImplementation, type MenuImplementation } from "./menu.context";
import { computed } from "vue";
import { provideDropdownMenuZContext } from "../dropdown-menu/dropdown-menu.context";

type MenuProps = DropdownMenuRootProps & ContextMenuRootProps & { type?: MenuImplementation };
type MenuEmits = DropdownMenuRootEmits & ContextMenuRootEmits;

const props = withDefaults(defineProps<MenuProps>(), { type: "dropdown-menu" });
const emits = defineEmits<MenuEmits>();
const forwarded = useForwardPropsEmits(props, emits);

const implComponent = computed(() => (props.type === "dropdown-menu" ? DropdownMenuRoot : ContextMenuRoot));

provideMenuImplementation(props.type);

// Provide per-menu context so content can adjust z-index when used inside a Vaul drawer.
provideDropdownMenuZContext();
</script>

<template>
  <component :is="implComponent" v-bind="forwarded">
    <slot />
  </component>
</template>
