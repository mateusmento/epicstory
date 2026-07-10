<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, ScrollArea } from "@/design-system";
import { issueStatusDotClass } from "@/presentationals/issue/status/status-fns";
import { IssueApi } from "@epicstory/api-client";
import type { IIssue } from "@epicstory/contracts";
import { watchDebounced } from "@vueuse/core";
import { ref, watch } from "vue";

const props = defineProps<{
  workspaceId: number;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  select: [issue: IIssue];
}>();

const issueApi = useDependency(IssueApi);
const search = ref("");
const issues = ref<IIssue[]>([]);
const loading = ref(false);

async function load() {
  if (!Number.isFinite(props.workspaceId)) return;
  loading.value = true;
  try {
    const page = await issueApi.fetchIssues({
      workspaceId: props.workspaceId,
      page: 0,
      count: 30,
      orderBy: "createdAt",
      order: "desc",
      search: search.value.trim() || undefined,
    });
    issues.value = page.content;
  } catch {
    issues.value = [];
  } finally {
    loading.value = false;
  }
}

watch(open, (v) => {
  if (v) {
    search.value = "";
    load();
  }
});

watchDebounced(
  search,
  () => {
    if (open.value) load();
  },
  { debounce: 250 },
);

function onSelect(issue: IIssue) {
  emit("select", issue);
  open.value = false;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-4 pt-4 pb-2">
        <DialogTitle>Insert issue</DialogTitle>
      </DialogHeader>
      <div class="px-4 pb-2">
        <Input v-model="search" placeholder="Search issues…" autofocus class="h-9" />
      </div>
      <ScrollArea class="h-72 border-t border-border">
        <div class="p-1">
          <button
            v-for="issue in issues"
            :key="issue.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            @click="onSelect(issue)"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full ring-1 ring-border"
              :class="issueStatusDotClass(issue.status)"
            />
            <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ issue.issueKey }}</span>
            <span class="min-w-0 truncate">{{ issue.title || "Untitled" }}</span>
          </button>
          <div
            v-if="!loading && issues.length === 0"
            class="px-3 py-8 text-center text-xs text-muted-foreground"
          >
            No issues found
          </div>
          <div v-if="loading" class="px-3 py-6 text-center text-xs text-muted-foreground">Searching…</div>
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
