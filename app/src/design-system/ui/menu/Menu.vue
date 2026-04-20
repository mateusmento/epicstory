<script setup lang="ts">
import type {
  ContextMenuRootEmits,
  ContextMenuRootProps,
  DropdownMenuRootEmits,
  DropdownMenuRootProps,
} from "reka-ui";
import { ContextMenuRoot, DropdownMenuRoot, useForwardPropsEmits } from "reka-ui";
import { computed } from "vue";
import {
  provideDropdownMenuZContext,
  provideMenuImplementation,
  type MenuImplementation,
} from "./menu.context";
import MenuContextCloseSink from "./MenuContextCloseSink.vue";

type MenuProps = DropdownMenuRootProps & ContextMenuRootProps & { type?: MenuImplementation };
type MenuEmits = DropdownMenuRootEmits & ContextMenuRootEmits;

const props = withDefaults(defineProps<MenuProps>(), { type: "dropdown-menu" });
const emits = defineEmits<MenuEmits>();
const forwarded = useForwardPropsEmits(props, emits);

const open = defineModel<boolean>("open", { default: false });

const implComponent = computed(() => (props.type === "dropdown-menu" ? DropdownMenuRoot : ContextMenuRoot));

provideMenuImplementation(props.type);

// Provide per-menu context so content can adjust z-index when used inside a Vaul drawer.
provideDropdownMenuZContext();
</script>

<template>
  <component :is="implComponent" v-bind="forwarded" v-model:open="open">
    <MenuContextCloseSink v-if="type === 'context-menu'" :open="open">
      <slot />
    </MenuContextCloseSink>

    <slot v-else />
  </component>
</template>
