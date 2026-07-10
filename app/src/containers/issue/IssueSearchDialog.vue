<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { Dialog, DialogContent, DialogTrigger, ScrollArea } from "@/design-system";
import { IconSearch } from "@/design-system/icons";
import { IssueKey } from "@/presentationals/issue";
import { issueStatusDotClass } from "@/presentationals/issue/status";
import { IssueApi } from "@epicstory/api-client";
import type { IIssue } from "@epicstory/contracts";
import { watchDebounced } from "@vueuse/core";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  workspaceId: string | number;
  projectId: string | number;
}>();

const open = defineModel<boolean>("open", { default: false });

const issueApi = useDependency(IssueApi);
const router = useRouter();

const searchTerm = ref("");
const issues = ref<IIssue[]>([]);
const loading = ref(false);
let requestId = 0;

async function fetchIssues(term: string) {
  const id = ++requestId;
  loading.value = true;
  try {
    const page = await issueApi.fetchIssues({
      projectId: +props.projectId,
      page: 0,
      count: 25,
      orderBy: "createdAt",
      order: "desc",
      search: term.trim() || undefined,
    });
    if (id !== requestId) return;
    issues.value = page.content;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

watch(
  open,
  (isOpen) => {
    if (!isOpen) {
      searchTerm.value = "";
      issues.value = [];
      return;
    }
    fetchIssues("");
  },
  { immediate: true },
);

watchDebounced(
  searchTerm,
  (term) => {
    if (!open.value) return;
    fetchIssues(term);
  },
  { debounce: 250 },
);

async function onSelect(issue: IIssue) {
  open.value = false;
  await router.push({
    name: "project-issue",
    params: {
      workspaceId: String(props.workspaceId),
      projectId: String(props.projectId),
      issueId: String(issue.id),
    },
  });
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <slot name="trigger">
        <button
          type="button"
          class="flex:row-md flex:center w-96 h-7 mx-auto rounded-lg bg-secondary text-xs text-secondary-foreground"
        >
          <IconSearch />
          Search issues
        </button>
      </slot>
    </DialogTrigger>
    <DialogContent class="top-[20%] translate-y-0 p-0 gap-0 overflow-hidden md:max-w-lg">
      <div class="flex items-center border-b px-3">
        <IconSearch class="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          v-model="searchTerm"
          type="search"
          autofocus
          placeholder="Search issues by key, title, or description…"
          class="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <ScrollArea class="max-h-80">
        <div class="p-1">
          <div v-if="issues.length === 0" class="px-3 py-6 text-center text-sm text-muted-foreground">
            <span v-if="loading">Searching…</span>
            <span v-else>No issues found.</span>
          </div>

          <template v-else>
            <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {{ searchTerm.trim() ? "Issues" : "Recent issues" }}
            </div>
            <button
              v-for="issue in issues"
              :key="issue.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              @click="onSelect(issue)"
            >
              <div
                class="h-2 w-2 shrink-0 rounded-full ring-1 ring-border"
                :class="issueStatusDotClass(issue.status)"
              />
              <IssueKey :issue-key="issue.issueKey" />
              <span class="flex-1 truncate">{{ issue.title }}</span>
            </button>
          </template>
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
