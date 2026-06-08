<script setup lang="ts">
import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import { emptyPaginatedListView, type PaginatedListView } from "@/lib/async";
import type { IUser as IUser } from "@epicstory/contracts";
import WorkspaceMemberMenu from "./WorkspaceMemberMenu.vue";

withDefaults(
  defineProps<{
    disabled?: boolean;
    list?: PaginatedListView<IUser>;
    selectedLabel?: string;
    searchPlaceholder?: string;
  }>(),
  {
    list: () => emptyPaginatedListView<IUser>(),
  },
);

const users = defineModel<IUser[]>("users", { default: () => [] });

const emit = defineEmits<{
  (e: "add", user: IUser): void;
  (e: "remove", user: IUser): void;
  (e: "search", query: string): void;
  (e: "load-more"): void;
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
        :list="list"
        :selected-label="selectedLabel"
        :search-placeholder="searchPlaceholder"
        @add="emit('add', $event)"
        @remove="emit('remove', $event)"
        @search="emit('search', $event)"
        @load-more="emit('load-more')"
      />
    </MenuContent>
  </Menu>
</template>
