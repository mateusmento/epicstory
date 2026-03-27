<script setup lang="ts">
import { MenuInput, MenuItem, MenuSeparator, ScrollArea } from "@/design-system";
import { useIssues, type Issue } from "@/domain/issues";
import { computed, ref, watchEffect } from "vue";

const props = defineProps<{
  projectId: number;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "select", issue: Pick<Issue, "id" | "title" | "status">): void;
  (e: "clear"): void;
}>();

const query = ref("");

const { issues, isFetchingIssues, hasMoreIssues, fetchIssues, fetchMoreIssues } = useIssues();

watchEffect(() => {
  fetchIssues({
    projectId: props.projectId,
    page: 0,
    count: 20,
    orderBy: "createdAt",
    order: "desc",
    search: query.value.trim(),
  } as any);
});

function onReachedBottom() {
  fetchMoreIssues({
    projectId: props.projectId,
    search: query.value.trim(),
    orderBy: "createdAt",
    order: "desc",
  } as any);
}

type StatusOption = { label: string; dotClass: string };
const statusOptions = computed<Record<string, StatusOption>>(() => ({
  backlog: { label: "Backlog", dotClass: "bg-zinc-300" },
  todo: { label: "Todo", dotClass: "bg-zinc-300" },
  doing: { label: "In progress", dotClass: "bg-blue-500" },
  done: { label: "Done", dotClass: "bg-emerald-500" },
}));

function dotClass(status: string | null | undefined) {
  if (!status) return "bg-zinc-300";
  return statusOptions.value[status]?.dotClass ?? "bg-zinc-300";
}

function onSelect(issue: any) {
  emit("select", { id: issue.id, title: issue.title, status: issue.status });
}
</script>

<template>
  <div class="w-80 min-h-14">
    <MenuInput v-model="query" :placeholder="placeholder ?? 'Search issues…'" auto-focus />
    <MenuSeparator />

    <div class="px-2 py-1 text-[11px] text-muted-foreground">Issues</div>
    <ScrollArea class="h-96" @click.stop @reached-bottom="onReachedBottom">
      <div class="!block">
        <MenuItem v-if="!disabled" class="text-xs text-muted-foreground" @select="emit('clear')">
          Clear selection
        </MenuItem>

        <MenuItem
          v-for="issue in issues"
          :key="issue.id"
          class="flex:row-lg flex:center-y"
          :disabled="disabled"
          @select="onSelect(issue)"
        >
          <div class="w-2 h-2 rounded-full ring-1 ring-border" :class="dotClass(issue.status)"></div>
          <div class="flex-1 truncate text-sm">{{ issue.title }}</div>
          <div class="text-xs text-muted-foreground">
            {{ statusOptions[issue.status]?.label ?? "Unknown" }}
          </div>
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
