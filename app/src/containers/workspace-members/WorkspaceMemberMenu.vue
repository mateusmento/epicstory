<script setup lang="ts">
import { useAuth } from "@/domain/auth";
import { useWorkspace, useWorkspaceMemberSearch } from "@/domain/workspace";
import WorkspaceMemberMenuView from "@/presentationals/workspace-members/WorkspaceMemberMenu.vue";
import type { IUser } from "@epicstory/contracts";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    excludeUserIds?: number[];
    selectedLabel?: string;
    searchPlaceholder?: string;
    density?: "default" | "compact";
    currentUserId?: number;
  }>(),
  {
    excludeUserIds: () => [],
    selectedLabel: "Members",
    searchPlaceholder: "Search workspace members…",
    density: "default",
  },
);

const users = defineModel<IUser[]>("users", { default: () => [] });

const emit = defineEmits<{
  (e: "add", user: IUser): void;
  (e: "remove", user: IUser): void;
}>();

const { workspaceId } = useWorkspace();
const { user: authUser } = useAuth();
const memberSearch = useWorkspaceMemberSearch();

const resolvedCurrentUser = computed(() => {
  if (props.currentUserId == null) return null;
  if (authUser.value?.id !== props.currentUserId) return null;
  return authUser.value;
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
    :list="memberSearch"
    :exclude-user-ids="excludeUserIds"
    :selected-label="selectedLabel"
    :search-placeholder="searchPlaceholder"
    :density="density"
    :current-user-id="currentUserId"
    :current-user="resolvedCurrentUser"
    @add="emit('add', $event)"
    @remove="emit('remove', $event)"
    @search="onSearch"
    @load-more="onLoadMore"
  />
</template>
