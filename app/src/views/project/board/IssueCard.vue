<script setup lang="ts">
import { useDraggingById } from "@/components/board/useDraggingById";
import { IssueLabelTags } from "@/components/issue";
import { IssueContextMenu } from "@/components/issue";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { type BacklogItem } from "@/domain/backlog";
import { useBacklog } from "@/domain/backlog";
import { type Issue } from "@/domain/issues";
import { formatDistanceToNow } from "date-fns";

const props = defineProps<{ item: BacklogItem }>();

const emit = defineEmits<{
  (e: "openIssue", issue: Issue): void;
  (e: "labels-change", issue: Issue, labels: number[]): void;
}>();

type ColumnStatus = "todo" | "doing" | "done";

const { isDragging } = useDraggingById();
const { updateIssue, addAssignee, removeAssignee, addLabel, removeLabel, removeIssue } = useBacklog();

function formatDueDate(date: string | null | undefined) {
  if (!date) return null;
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return null;
  }
}

function issuePriorityBadge(priority: number | null | undefined) {
  if (!priority || priority <= 0) return null;
  if (priority >= 3) return { label: `P${priority}`, cls: "bg-red-100 text-red-700 border-red-200" };
  if (priority >= 2) return { label: `P${priority}`, cls: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: `P${priority}`, cls: "bg-yellow-100 text-yellow-800 border-yellow-200" };
}

function statusBadge(status: ColumnStatus) {
  if (status === "doing") return { label: "In progress", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (status === "done") return { label: "Done", cls: "bg-green-100 text-green-700 border-green-200" };
  return { label: "To do", cls: "bg-gray-100 text-gray-700 border-gray-200" };
}

function openIssue(issue: Issue) {
  emit("openIssue", issue);
}

function onLabelsChange(issue: Issue, labels: number[]) {
  emit("labels-change", issue, labels);
}
</script>

<template>
  <IssueContextMenu
    :issue="item.issue"
    :workspace-id="+item.issue.workspaceId"
    :actions="{ updateIssue, addAssignee, removeAssignee, addLabel, removeLabel, removeIssue }"
  >
    <div
      :class="
        cn(
          'group relative bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move',
          {
            'opacity-0': isDragging(item.id),
            'border-dashed border-2 bg-transparent shadow-none': isDragging(item.id),
          },
        )
      "
      @dblclick.stop="openIssue(item.issue)"
    >
      <div
        v-if="item.issue.parentIssue?.title"
        class="text-[11px] text-secondary-foreground truncate mb-1 flex items-center gap-1"
      >
        <span class="shrink-0">EP-{{ item.issue.id }}</span>
        <Icon name="oi-chevron-right" class="w-3 h-3 text-muted-foreground shrink-0" />
        <span class="truncate">{{ item.issue.parentIssue.title }}</span>
      </div>

      <div class="flex:row-md items-baseline justify-between gap-2">
        <div class="font-medium text-sm text-foreground line-clamp-2">
          {{ item.issue.title || "Untitled issue" }}
        </div>
        <div v-if="!item.issue.parentIssue?.title" class="text-[11px] text-secondary-foreground">
          #{{ item.issue.id }}
        </div>
      </div>

      <div class="mt-2 flex:row-md flex:center-y gap-2 flex-wrap">
        <span
          :class="[
            'text-xs px-2 py-0.5 rounded border font-medium capitalize',
            statusBadge(item.issue.status as any).cls,
          ]"
        >
          {{ statusBadge(item.issue.status as any).label }}
        </span>

        <span
          v-if="issuePriorityBadge(item.issue.priority)"
          :class="[
            'text-xs px-2 py-0.5 rounded border font-medium',
            issuePriorityBadge(item.issue.priority)!.cls,
          ]"
        >
          {{ issuePriorityBadge(item.issue.priority)!.label }}
        </span>

        <span v-if="formatDueDate(item.issue.dueDate)" class="text-xs text-secondary-foreground">
          Due {{ formatDueDate(item.issue.dueDate) }}
        </span>
      </div>

      <div
        v-if="item.issue.assignees?.length || item.issue.labels?.length"
        class="flex:row-md flex-wrap mt-3"
      >
        <img
          v-for="(assignee, i) in item.issue.assignees.slice(0, 5)"
          :key="assignee.id"
          :src="assignee.picture"
          :class="cn('w-6 h-6 rounded-full border-2 border-white object-cover', i > 0 && '-ml-4')"
          :title="assignee.name"
        />
        <div
          v-if="item.issue.assignees.length > 5"
          class="w-6 h-6 rounded-full bg-secondary text-secondary-foreground border-2 border-white -ml-4 flex items-center justify-center text-[10px]"
          :title="`+${item.issue.assignees.length - 5} more`"
        >
          +{{ item.issue.assignees.length - 5 }}
        </div>

        <IssueLabelTags
          :workspace-id="+item.issue.workspaceId"
          :disabled="!item.issue"
          :model-value="(item.issue?.labels ?? []).map((l) => l.id)"
          @update:model-value="onLabelsChange(item.issue, $event)"
        />
      </div>
    </div>
  </IssueContextMenu>
</template>
