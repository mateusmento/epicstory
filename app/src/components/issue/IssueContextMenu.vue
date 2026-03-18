<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/design-system";
import type { Issue } from "@/domain/issues";
import { MagnifyingGlassIcon } from "@radix-icons/vue";
import { computed, getCurrentInstance, ref } from "vue";
import IssueAssigneesSubMenu from "./issue-context-menu/IssueAssigneesSubMenu.vue";
import IssueDueDateSubMenu from "./issue-context-menu/IssueDueDateSubMenu.vue";
import IssueLabelsSubMenu from "./issue-context-menu/IssueLabelsSubMenu.vue";
import IssueStatusSubMenu from "./issue-context-menu/IssueStatusSubMenu.vue";
import IssueDeleteDialog from "./issue-context-menu/IssueDeleteDialog.vue";
import IssueRenameDialog from "./issue-context-menu/IssueRenameDialog.vue";
import type { IssueContextMenuActions } from "./issue-context-menu/types";
import { closeAllContextMenusExcept } from "./issue-context-menu/context-menu-registry";
import ContextMenuRegistryBridge from "./issue-context-menu/ContextMenuRegistryBridge.vue";

const props = defineProps<{
  issue: Issue;
  workspaceId: number;
  actions: IssueContextMenuActions;
  disabled?: boolean;
}>();

const renameOpen = ref(false);
const deleteOpen = ref(false);
const actionsQuery = ref("");

const menuId = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1_000_000_000);

const labelIds = computed(() => (props.issue?.labels ?? []).map((l) => l.id));

async function onLabelsUpdate(nextIds: number[]) {
  const prev = new Set(labelIds.value);
  const next = new Set(nextIds);

  for (const id of next) {
    if (!prev.has(id)) {
      await props.actions.addLabel(props.issue.id, id);
    }
  }

  for (const id of prev) {
    if (!next.has(id)) {
      await props.actions.removeLabel(props.issue.id, id);
    }
  }
}

function onStatusSelect(status: string) {
  props.actions.updateIssue(props.issue.id, { status });
}

function onAssigneeAdd(userId: number) {
  props.actions.addAssignee(props.issue.id, userId);
}

function onAssigneeRemove(userId: number) {
  props.actions.removeAssignee(props.issue.id, userId);
}

function onDueDateChange(dueDate: string | null) {
  props.actions.updateIssue(props.issue.id, { dueDate });
}

function onRename(title: string) {
  props.actions.updateIssue(props.issue.id, { title });
}

function onDelete() {
  props.actions.removeIssue(props.issue.id);
}

const q = computed(() => actionsQuery.value.trim().toLowerCase());
const showStatus = computed(() => !q.value || "status".includes(q.value));
const showAssignee = computed(() => !q.value || "assignee".includes(q.value));
const showLabels = computed(() => !q.value || "labels".includes(q.value) || "label".includes(q.value));
const showDueDate = computed(() => {
  return !q.value || "due date".includes(q.value) || "date".includes(q.value) || "due".includes(q.value);
});
const showRename = computed(() => !q.value || "rename".includes(q.value));
const showDelete = computed(() => !q.value || "delete".includes(q.value) || "remove".includes(q.value));

function onOpenUpdate(isOpen: boolean) {
  if (!isOpen) return;
  closeAllContextMenusExcept(menuId);
}
</script>

<template>
  <ContextMenu @update:open="onOpenUpdate">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>

    <ContextMenuRegistryBridge :menu-id="menuId" />

    <ContextMenuContent class="w-64">
      <div class="px-2 py-1" @click.stop @pointerdown.stop>
        <div class="flex items-center gap-2 rounded-md border px-2">
          <MagnifyingGlassIcon class="h-4 w-4 text-muted-foreground" />
          <input
            v-model="actionsQuery"
            type="text"
            class="h-9 w-full bg-transparent text-sm outline-none"
            placeholder="Search actions…"
          />
        </div>
      </div>
      <ContextMenuSeparator />

      <ContextMenuSub v-if="showStatus">
        <ContextMenuSubTrigger :disabled="disabled">Status</ContextMenuSubTrigger>
        <ContextMenuSubContent class="w-56 p-1">
          <IssueStatusSubMenu :value="issue.status" @select="onStatusSelect" />
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub v-if="showAssignee">
        <ContextMenuSubTrigger :disabled="disabled">Assignee</ContextMenuSubTrigger>
        <ContextMenuSubContent class="p-0 w-72">
          <IssueAssigneesSubMenu
            :assignees="issue.assignees ?? []"
            :disabled="disabled"
            @add="onAssigneeAdd"
            @remove="onAssigneeRemove"
          />
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub v-if="showLabels">
        <ContextMenuSubTrigger :disabled="disabled">Labels</ContextMenuSubTrigger>
        <ContextMenuSubContent class="p-0 w-80">
          <IssueLabelsSubMenu
            :workspace-id="workspaceId"
            :disabled="disabled"
            :model-value="labelIds"
            @update:model-value="onLabelsUpdate"
          />
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub v-if="showDueDate">
        <ContextMenuSubTrigger :disabled="disabled">
          {{ issue.dueDate ? "Change due date" : "Set due date" }}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent class="p-0 w-72">
          <IssueDueDateSubMenu :due-date="issue.dueDate" :disabled="disabled" @change="onDueDateChange" />
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuItem v-if="showRename" :disabled="disabled" @click="renameOpen = true"
        >Rename</ContextMenuItem
      >

      <ContextMenuSeparator v-if="showDelete" />

      <ContextMenuItem
        v-if="showDelete"
        :disabled="disabled"
        class="text-destructive focus:text-destructive data-[highlighted]:bg-destructive/20"
        @click="deleteOpen = true"
      >
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>

  <IssueRenameDialog
    :open="renameOpen"
    :current-title="issue.title ?? ''"
    :disabled="disabled"
    @update:open="renameOpen = $event"
    @confirm="onRename"
  />

  <IssueDeleteDialog
    :open="deleteOpen"
    :title="issue.title ?? ''"
    :disabled="disabled"
    @update:open="deleteOpen = $event"
    @confirm="onDelete"
  />
</template>
