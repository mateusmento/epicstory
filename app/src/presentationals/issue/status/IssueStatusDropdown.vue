<script setup lang="ts">
import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import IssueStatusMenu from "./IssueStatusMenu.vue";

const props = defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  (e: "select", status: string): void;
}>();
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>
    <MenuContent as-child align="start" side="bottom">
      <IssueStatusMenu :value="value" @select="emit('select', $event)" />
    </MenuContent>
  </Menu>
</template>
