<script setup lang="ts">
import { provideBacklogRowContext, type BacklogEditingState } from "../backlog-row.context";
import BacklogItemRow from "../BacklogItemRow.vue";
import type { Issue } from "@/domain/issues";
import { reactive } from "vue";

const props = defineProps<{
  workspaceId: number;
  gridColsClass: string;
  itemId: number;
  issue: Issue;
}>();

// Overlay is purely visual; provide a minimal context so `BacklogItemRow` can render.
const editing = reactive<BacklogEditingState>({ id: null, title: "" });

provideBacklogRowContext({
  workspaceId: props.workspaceId,
  gridColsClass: props.gridColsClass,
  editing,
  openIssue: () => {},
  startEdit: () => {},
  cancelEdit: () => {},
  saveEdit: () => {},
  updateIssueStatus: () => {},
  statusDotClass: () => "bg-zinc-300",
  onLabelsChange: async () => {},
});
</script>

<template>
  <div class="bg-white shadow-lg ring-1 ring-border rounded-md overflow-hidden">
    <BacklogItemRow
      :item-id="props.itemId"
      :issue="props.issue"
      :dragging="false"
      drag-handle-title="Dragging…"
      :drag-handle-force-hidden="true"
    />
  </div>
</template>
