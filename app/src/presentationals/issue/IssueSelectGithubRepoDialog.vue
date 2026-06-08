<script lang="ts" setup>
import type { IGithubCatalogRepository } from "@epicstory/contracts";
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
import { emptyPaginatedListView, type PaginatedListView } from "@/lib/async";

withDefaults(
  defineProps<{
    open: boolean;
    selectedRepoGithubId: string | null;
    list?: PaginatedListView<IGithubCatalogRepository>;
  }>(),
  {
    list: () => emptyPaginatedListView<IGithubCatalogRepository>(),
  },
);

const searchQuery = defineModel<string>("searchQuery", { default: "" });

const emit = defineEmits<{
  "update:open": [value: boolean];
  selected: [repo: IGithubCatalogRepository];
  "load-more": [];
}>();
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
          :disabled="list.loading"
        />

        <div v-if="list.error" class="text-sm text-destructive">
          {{ list.error }}
        </div>
        <div v-else-if="list.loading" class="text-sm text-muted-foreground">Loading repositories…</div>
        <div v-else-if="list.items.length === 0" class="text-sm text-muted-foreground">
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
            v-for="repo in list.items"
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
              @click="emit('selected', repo)"
            >
              {{ selectedRepoGithubId === repo.githubRepoId ? "Selected" : "Select" }}
            </Button>
          </li>
        </ul>
        <Button
          v-if="list.hasMore && !list.loading"
          variant="ghost"
          size="sm"
          type="button"
          class="self-start"
          :disabled="list.loadingMore"
          @click="emit('load-more')"
        >
          {{ list.loadingMore ? "Loading…" : "Load more repositories" }}
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
