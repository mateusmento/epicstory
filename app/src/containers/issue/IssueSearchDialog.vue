<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { Dialog, DialogContent, DialogTrigger, ScrollArea } from "@/design-system";
import { IconSearch } from "@/design-system/icons";
import { IssueKey } from "@/presentationals/issue";
import { issueStatusDotClass } from "@/presentationals/issue/status";
import { IssueApi, WorkspaceApi } from "@epicstory/api-client";
import type { IIssue, Project } from "@epicstory/contracts";
import { watchDebounced } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import IssueSearchProjectFilters from "./IssueSearchProjectFilters.vue";

const PAGE_SIZE = 25;

const props = defineProps<{
  workspaceId: string | number;
  projectId: string | number;
}>();

const open = defineModel<boolean>("open", { default: false });

const issueApi = useDependency(IssueApi);
const workspaceApi = useDependency(WorkspaceApi);
const router = useRouter();

const searchTerm = ref("");
const projects = ref<Project[]>([]);
/** `null` = all projects in the workspace. */
const selectedProjectIds = ref<number[] | null>(null);
const issues = ref<IIssue[]>([]);
const page = ref(0);
const hasNext = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
let requestId = 0;

const currentProjectId = computed(() => {
  const id = Number(props.projectId);
  return Number.isFinite(id) ? id : null;
});
const currentWorkspaceId = computed(() => {
  const id = Number(props.workspaceId);
  return Number.isFinite(id) ? id : null;
});
const isAllProjects = computed(() => selectedProjectIds.value === null);
const showProjectLabel = computed(() => isAllProjects.value || (selectedProjectIds.value?.length ?? 0) !== 1);

const projectNameById = computed(() => {
  const map = new Map<number, string>();
  for (const project of projects.value) {
    map.set(project.id, project.name);
  }
  return map;
});

const listQuery = computed(() => {
  const workspaceId = currentWorkspaceId.value;
  if (workspaceId == null) return null;
  return {
    workspaceId,
    count: PAGE_SIZE,
    orderBy: "createdAt" as const,
    order: "desc" as const,
    search: searchTerm.value.trim() || undefined,
    projectIds: selectedProjectIds.value ?? undefined,
  };
});

async function ensureProjectsLoaded() {
  const workspaceId = currentWorkspaceId.value;
  if (projects.value.length > 0 || workspaceId == null) return;
  const result = await workspaceApi.findProjects(workspaceId, {
    page: 0,
    count: 200,
    orderBy: "name",
    order: "asc",
  });
  projects.value = result.content;
}

async function replaceIssues() {
  const query = listQuery.value;
  if (!query) return;

  const id = ++requestId;
  loading.value = true;
  loadingMore.value = false;
  try {
    const result = await issueApi.fetchIssues({
      ...query,
      page: 0,
    });
    if (id !== requestId) return;
    issues.value = result.content;
    page.value = result.page;
    hasNext.value = result.hasNext;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

async function appendIssues() {
  const query = listQuery.value;
  if (!query || !open.value || !hasNext.value || loading.value || loadingMore.value) return;

  const id = requestId;
  loadingMore.value = true;
  try {
    const result = await issueApi.fetchIssues({
      ...query,
      page: page.value + 1,
    });
    if (id !== requestId) return;
    issues.value = [...issues.value, ...result.content];
    page.value = result.page;
    hasNext.value = result.hasNext;
  } finally {
    if (id === requestId) loadingMore.value = false;
  }
}

function resetList() {
  searchTerm.value = "";
  issues.value = [];
  page.value = 0;
  hasNext.value = false;
  loadingMore.value = false;
  selectedProjectIds.value = currentProjectId.value != null ? [currentProjectId.value] : null;
}

let ignoreProjectFilterWatch = false;

watch(
  open,
  async (isOpen) => {
    if (!isOpen) {
      resetList();
      return;
    }
    ignoreProjectFilterWatch = true;
    selectedProjectIds.value = currentProjectId.value != null ? [currentProjectId.value] : null;
    ignoreProjectFilterWatch = false;
    await ensureProjectsLoaded();
    await replaceIssues();
  },
  { immediate: true },
);

watchDebounced(
  searchTerm,
  () => {
    if (!open.value) return;
    replaceIssues();
  },
  { debounce: 250 },
);

watch(selectedProjectIds, () => {
  if (!open.value || ignoreProjectFilterWatch) return;
  replaceIssues();
});

async function onSelect(issue: IIssue) {
  open.value = false;
  await router.push({
    name: "project-issue",
    params: {
      workspaceId: String(props.workspaceId),
      projectId: String(issue.projectId),
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

      <IssueSearchProjectFilters v-model="selectedProjectIds" :projects="projects" />

      <ScrollArea class="h-80" @reached-bottom="appendIssues">
        <div class="p-1 !block">
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
              <span class="min-w-0 flex-1 truncate">{{ issue.title }}</span>
              <span v-if="showProjectLabel" class="max-w-24 shrink-0 truncate text-xs text-muted-foreground">
                {{ projectNameById.get(issue.projectId) }}
              </span>
            </button>

            <div v-if="loadingMore" class="px-2 py-2 text-xs text-muted-foreground">Loading…</div>
            <div v-else-if="!hasNext" class="px-2 py-2 text-xs text-muted-foreground">End of results</div>
          </template>
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
