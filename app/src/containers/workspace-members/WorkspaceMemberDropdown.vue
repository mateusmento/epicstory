<script setup lang="ts">
import WorkspaceMemberDropdownView from "@/presentationals/workspace-members/WorkspaceMemberDropdown.vue";
import { useWorkspaceMemberSearch, useWorkspace } from "@/domain/workspace";
import type { IUser as IUser } from "@epicstory/contracts";
import { computed } from "vue";

const props = withDefaults(
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

const users = defineModel<IUser[]>("users", { default: () => [] });

const emit = defineEmits<{
  (e: "add", user: IUser): void;
  (e: "remove", user: IUser): void;
}>();

const { workspaceId } = useWorkspace();
const { members, search, loadMore, isFetchingMore, hasMore } = useWorkspaceMemberSearch();

const searchUsers = computed(() => {
  const exclude = new Set([...users.value.map((u) => u.id), ...props.excludeUserIds]);
  return members.value.map((m) => m.user).filter((u) => !exclude.has(u.id));
});

function onSearch(query: string) {
  search(workspaceId.value, query);
}

async function onLoadMore() {
  if (props.disabled) return;
  await loadMore(workspaceId.value);
}
</script>

<template>
  <WorkspaceMemberDropdownView
    v-model:users="users"
    :disabled="disabled"
    :search-users="searchUsers"
    :is-fetching-more="isFetchingMore"
    :has-more="hasMore"
    :selected-label="selectedLabel"
    :search-placeholder="searchPlaceholder"
    @add="emit('add', $event)"
    @remove="emit('remove', $event)"
    @search="onSearch"
    @load-more="onLoadMore"
  />
</template>
