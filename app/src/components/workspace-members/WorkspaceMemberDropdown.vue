<script setup lang="ts">
import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import type { User } from "@/domain/user";
import WorkspaceMemberMenu from "./WorkspaceMemberMenu.vue";

withDefaults(
  defineProps<{
    disabled?: boolean;
    excludeUserIds?: number[];
    selectedLabel?: string;
    searchPlaceholder?: string;
  }>(),
  {
    excludeUserIds: () => [],
  },
);

const users = defineModel<User[]>("users", { default: () => [] });

const emit = defineEmits<{
  (e: "add", user: User): void;
  (e: "remove", user: User): void;
}>();
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child :disabled="disabled">
      <slot :users="users" :assignees="users" />
    </MenuTrigger>

    <MenuContent as-child>
      <WorkspaceMemberMenu
        v-model:users="users"
        :disabled="disabled"
        :exclude-user-ids="excludeUserIds"
        :selected-label="selectedLabel"
        :search-placeholder="searchPlaceholder"
        @add="emit('add', $event)"
        @remove="emit('remove', $event)"
      />
    </MenuContent>
  </Menu>
</template>
