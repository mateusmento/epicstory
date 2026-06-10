<script setup lang="ts">
import { useWorkspace, useWorkspaceMemberSearch } from "@/domain/workspace";
import WorkspaceMemberMenuView from "@/presentationals/workspace-members/WorkspaceMemberMenu.vue";
import type { IUser } from "@epicstory/contracts";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    excludeUserIds?: number[];
    selectedLabel?: string;
    searchPlaceholder?: string;
  }>(),
  {
    excludeUserIds: () => [],
    selectedLabel: "Members",
    searchPlaceholder: "Search workspace members…",
  },
);

const users = defineModel<IUser[]>("users", { default: () => [] });

const emit = defineEmits<{
  (e: "add", user: IUser): void;
  (e: "remove", user: IUser): void;
}>();

const { workspaceId } = useWorkspace();
const memberSearch = useWorkspaceMemberSearch();

function onSearch(query: string) {
  memberSearch.search(workspaceId.value, query);
}

async function onLoadMore() {
  if (props.disabled) return;
  await memberSearch.loadMore(workspaceId.value);
}
</script>

<template>
  <WorkspaceMemberMenuView
    v-model:users="users"
    :disabled="disabled"
    :list="memberSearch"
    :exclude-user-ids="excludeUserIds"
    :selected-label="selectedLabel"
    :search-placeholder="searchPlaceholder"
    @add="emit('add', $event)"
    @remove="emit('remove', $event)"
    @search="onSearch"
    @load-more="onLoadMore"
  />
</template>
