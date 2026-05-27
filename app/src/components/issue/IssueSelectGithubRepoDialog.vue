<script lang="ts" setup>
import type { IGithubCatalogRepository } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/design-system";
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

function pickRepo(repo: IGithubCatalogRepository): void {
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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg max-h-[85vh] flex flex-col gap-0">
      <DialogHeader>
        <DialogTitle>Select GitHub repository</DialogTitle>
        <DialogDescription>
          Choose a repository from this workspace&apos;s GitHub App installation. Branches and pull requests
          on the issue will use the repo you pick here.
        </DialogDescription>
      </DialogHeader>

      <div class="py-3 flex flex-col gap-3 min-h-0 flex-1">
        <Input
          v-model="searchQuery"
          size="sm"
          placeholder="Search by owner or repository name…"
          :disabled="catalogLoading"
        />

        <div v-if="catalogError" class="text-sm text-destructive">
          {{ catalogError }}
        </div>
        <div v-else-if="catalogLoading" class="text-sm text-muted-foreground">Loading repositories…</div>
        <div v-else-if="filteredRepositories.length === 0" class="text-sm text-muted-foreground">
          {{
            searchQuery.trim()
              ? "No repositories match your search."
              : "No repositories available on this installation."
          }}
        </div>
        <ul
          v-else
          class="flex flex-col gap-1 min-h-0 overflow-y-auto max-h-[min(24rem,50vh)] border rounded-md divide-y m-0 p-0 list-none"
        >
          <li
            v-for="repo in filteredRepositories"
            :key="repo.githubRepoId"
            class="flex items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <div class="min-w-0">
              <div class="font-medium truncate">{{ repo.fullName }}</div>
              <div class="text-xs text-muted-foreground truncate">
                default: {{ repo.defaultBranch ?? "—" }}
              </div>
            </div>
            <Button
              size="sm"
              :variant="selectedRepoGithubId === repo.githubRepoId ? 'default' : 'outline'"
              type="button"
              class="shrink-0"
              @click="pickRepo(repo)"
            >
              {{ selectedRepoGithubId === repo.githubRepoId ? "Selected" : "Select" }}
            </Button>
          </li>
        </ul>
        <Button
          v-if="catalog?.hasNextPage && !catalogLoading"
          variant="ghost"
          size="sm"
          type="button"
          class="self-start"
          :disabled="catalogLoadingMore"
          @click="loadMoreCatalog"
        >
          {{ catalogLoadingMore ? "Loading…" : "Load more repositories" }}
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
