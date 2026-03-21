<script setup lang="ts">
import {
  DropdownMenuRoot,
  type DropdownMenuRootEmits,
  type DropdownMenuRootProps,
  useForwardPropsEmits,
} from "reka-ui";
import { provideDropdownMenuZContext } from "./dropdown-menu.context";
import { provideMenuImplementation } from "../menu/menu.context";

const props = defineProps<DropdownMenuRootProps>();
const emits = defineEmits<DropdownMenuRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);

// Provide per-menu context so content can adjust z-index when used inside a Vaul drawer.
provideDropdownMenuZContext();
provideMenuImplementation("dropdown-menu");
</script>

<template>
  <DropdownMenuRoot v-bind="forwarded">
    <slot />
  </DropdownMenuRoot>
</template>
