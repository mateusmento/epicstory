<script setup lang="ts">
import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import type { User } from "@/domain/user";
import IssueAssigneesMenu from "./IssueAssigneesMenu.vue";

defineProps<{
  assignees: User[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "add", user: User): void;
  (e: "remove", user: User): void;
}>();
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child :disabled="disabled">
      <slot :assignees="assignees" />
    </MenuTrigger>

    <MenuContent as-child>
      <IssueAssigneesMenu
        :assignees="assignees"
        :disabled="disabled"
        @add="emit('add', $event)"
        @remove="emit('remove', $event)"
      />
    </MenuContent>
  </Menu>
</template>
