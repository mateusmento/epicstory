<script setup lang="ts">
import WorkspaceMemberMenuView from "@/presentationals/workspace-members/WorkspaceMemberMenu.vue";
import { useWorkspaceMemberSearch, useWorkspace } from "@/domain/workspace";
import { toPaginatedListView } from "@/lib/async";
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

const list = computed(() => {
  const exclude = new Set([...users.value.map((u) => u.id), ...props.excludeUserIds]);
  return toPaginatedListView({
    ...memberSearch,
    items: memberSearch.items.map((m) => m.user).filter((u) => !exclude.has(u.id)),
  });
});

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
    :list="list"
    :selected-label="selectedLabel"
    :search-placeholder="searchPlaceholder"
    @add="emit('add', $event)"
    @remove="emit('remove', $event)"
    @search="onSearch"
    @load-more="onLoadMore"
  />
</template>
