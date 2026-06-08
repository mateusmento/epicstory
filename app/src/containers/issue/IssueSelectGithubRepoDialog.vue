<script lang="ts" setup>
import type { IGithubCatalogRepository } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";
import IssueSelectGithubRepoDialogView from "@/presentationals/issue/IssueSelectGithubRepoDialog.vue";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import { githubApiErrorMessage } from "@/domain/github";

const props = defineProps<{
  open: boolean;
  workspaceId: string;
  selectedRepoGithubId: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  selected: [repo: IGithubCatalogRepository];
}>();

const githubApi = useDependency(GithubIntegrationApi);

const searchQuery = ref("");
const catalogLoading = ref(false);
const catalogLoadingMore = ref(false);
const catalogError = ref<string | null>(null);
const catalog = ref<Awaited<ReturnType<typeof githubApi.listRepositories>> | null>(null);

const filteredRepositories = computed(() => {
  const repos = catalog.value?.repositories ?? [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return repos;
  return repos.filter((repo) => {
    const haystack = `${repo.fullName} ${repo.owner} ${repo.name}`.toLowerCase();
    return haystack.includes(q);
  });
});

async function loadCatalog(page = 1): Promise<void> {
  if (page === 1) {
    catalogLoading.value = true;
    catalogError.value = null;
  } else {
    catalogLoadingMore.value = true;
  }
  try {
    const next = await githubApi.listRepositories(+props.workspaceId, { page, perPage: 30 });
    if (page === 1) {
      catalog.value = next;
    } else if (catalog.value) {
      catalog.value = {
        ...next,
        repositories: [...catalog.value.repositories, ...next.repositories],
      };
    } else {
      catalog.value = next;
    }
  } catch (e: unknown) {
    if (page === 1) {
      catalog.value = null;
      catalogError.value = githubApiErrorMessage(e, "Could not load repositories from GitHub.");
    }
  } finally {
    catalogLoading.value = false;
    catalogLoadingMore.value = false;
  }
}

async function loadMoreCatalog(): Promise<void> {
  if (!catalog.value?.hasNextPage || catalogLoadingMore.value) return;
  await loadCatalog(catalog.value.page + 1);
}

function onSelected(repo: IGithubCatalogRepository): void {
  emit("selected", repo);
  emit("update:open", false);
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    searchQuery.value = "";
    catalogError.value = null;
    await loadCatalog(1);
  },
);
</script>

<template>
  <IssueSelectGithubRepoDialogView
    :open="open"
    :selected-repo-github-id="selectedRepoGithubId"
    :repositories="filteredRepositories"
    :loading="catalogLoading"
    :loading-more="catalogLoadingMore"
    :error="catalogError"
    :has-next-page="catalog?.hasNextPage ?? false"
    v-model:search-query="searchQuery"
    @update:open="emit('update:open', $event)"
    @selected="onSelected"
    @load-more="loadMoreCatalog"
  />
</template>
