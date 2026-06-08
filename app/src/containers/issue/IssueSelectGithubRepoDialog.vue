<script lang="ts" setup>
import type { IGithubCatalogRepository } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";
import IssueSelectGithubRepoDialogView from "@/presentationals/issue/IssueSelectGithubRepoDialog.vue";
import { useGithubRepositoryCatalog } from "@/domain/github";
import { toPaginatedListView } from "@/lib/async";

const props = defineProps<{
  open: boolean;
  workspaceId: string;
  selectedRepoGithubId: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  selected: [repo: IGithubCatalogRepository];
}>();

const searchQuery = ref("");
const catalog = useGithubRepositoryCatalog({ pageSize: 30 });

const filteredRepositories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return catalog.items;
  return catalog.items.filter((repo) => {
    const haystack = `${repo.fullName} ${repo.owner} ${repo.name}`.toLowerCase();
    return haystack.includes(q);
  });
});

const list = computed(() =>
  toPaginatedListView({
    ...catalog,
    items: filteredRepositories.value,
  }),
);

function onSelected(repo: IGithubCatalogRepository): void {
  emit("selected", repo);
  emit("update:open", false);
}

async function onLoadMore(): Promise<void> {
  await catalog.loadMore(+props.workspaceId);
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    searchQuery.value = "";
    catalog.reset();
    await catalog.load(+props.workspaceId);
  },
);
</script>

<template>
  <IssueSelectGithubRepoDialogView
    :open="open"
    :selected-repo-github-id="selectedRepoGithubId"
    :list="list"
    v-model:search-query="searchQuery"
    @update:open="emit('update:open', $event)"
    @selected="onSelected"
    @load-more="onLoadMore"
  />
</template>
