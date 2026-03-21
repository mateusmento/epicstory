<script setup lang="ts">
import { MenuInput, MenuItem, MenuSeparator, ScrollArea } from "@/design-system";
import { useBacklog } from "@/domain/backlog";
import { useIssues, type Issue } from "@/domain/issues";
import { computed, ref, watchEffect } from "vue";

const props = defineProps<{
  issue: Issue;
  disabled?: boolean;
}>();

const { issues, isFetchingIssues, hasMoreIssues, fetchIssues, fetchMoreIssues } = useIssues();

const { markAsSubIssueOf } = useBacklog();

const query = ref("");

watchEffect(() => {
  fetchIssues({
    projectId: props.issue.projectId,
    page: 0,
    count: 20,
    orderBy: "createdAt",
    assigneeId: 1,
    order: "desc",
    search: query.value.trim(),
  });
});

function onReachedBottom() {
  fetchMoreIssues({
    projectId: props.issue.projectId,
    search: query.value.trim(),
    orderBy: "createdAt",
    order: "desc",
  });
}

type StatusOption = { label: string; dotClass: string };

const options = computed<Record<string, StatusOption>>(() => ({
  backlog: { label: "Backlog", dotClass: "bg-zinc-300" },
  todo: { label: "Todo", dotClass: "bg-zinc-300" },
  doing: { label: "In progress", dotClass: "bg-blue-500" },
  done: { label: "Done", dotClass: "bg-emerald-500" },
}));

function issueStatusDotClass(status: string | null | undefined) {
  if (!status) return "bg-zinc-300";
  return options.value[status]?.dotClass ?? "bg-zinc-300";
}

function onIssueSelect(issueId: number) {
  markAsSubIssueOf(props.issue.id, issueId);
}
</script>

<template>
  <div>
    <MenuInput v-model="query" placeholder="Search issues…" auto-focus />
    <MenuSeparator />
    <div class="px-2 py-1 text-[11px] text-muted-foreground">Issues</div>
    <ScrollArea class="h-96" @click.stop @reached-bottom="onReachedBottom">
      <div class="!block">
        <MenuItem
          v-for="issue in issues"
          :key="issue.id"
          class="flex:row-lg flex:center-y"
          @select="onIssueSelect(issue.id)"
        >
          <div
            class="w-2 h-2 rounded-full ring-1 ring-border"
            :class="issueStatusDotClass(issue.status)"
          ></div>
          <div class="flex-1 truncate text-sm">{{ issue.title }}</div>
          <div class="text-xs text-muted-foreground">{{ options[issue.status]?.label ?? "Unknown" }}</div>
        </MenuItem>
        <div v-if="isFetchingIssues" class="ml-2 my-2 text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="issues.length === 0" class="ml-2 my-2 text-xs text-muted-foreground">
          No issues found
        </div>
        <div v-else-if="!hasMoreIssues" class="ml-2 my-2 text-xs text-muted-foreground">End of results</div>
      </div>
    </ScrollArea>
  </div>
</template>
