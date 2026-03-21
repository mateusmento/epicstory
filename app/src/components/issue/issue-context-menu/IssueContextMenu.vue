<script setup lang="ts">
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/design-system";
import type { Issue } from "@/domain/issues";
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from "vue";
import { closeAllContextMenusExcept, registerContextMenu } from "./context-menu-registry";
import IssueAssigneesMenu from "./IssueAssigneesMenu.vue";
import IssueDeleteDialog from "./IssueDeleteDialog.vue";
import IssueDueDateMenu from "./IssueDueDateMenu.vue";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";
import IssueRenameDialog from "./IssueRenameDialog.vue";
import IssueStatusMenu from "./IssueStatusMenu.vue";
import IssueSubIssueMenu from "./IssueSubIssueMenu.vue";
import type { IssueContextMenuActions } from "./types";

const props = defineProps<{
  issue: Issue;
  workspaceId: number;
  actions: IssueContextMenuActions;
  disabled?: boolean;
}>();

const renameOpen = ref(false);
const deleteOpen = ref(false);
const open = ref(false);

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

function onOpenUpdate(isOpen: boolean) {
  open.value = isOpen;
  if (isOpen) closeAllContextMenusExcept(menuId);
}

let unregister: (() => void) | undefined;
onMounted(() => {
  unregister = registerContextMenu(menuId, () => {
    open.value = false;
  });
});
onBeforeUnmount(() => {
  unregister?.();
});
</script>

<template>
  <Menu type="context-menu" :open="open" @update:open="onOpenUpdate">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>

    <MenuContent class="w-64">
      <MenuSub>
        <MenuSubTrigger :disabled="disabled">Status</MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueStatusMenu :value="issue.status" @select="onStatusSelect" />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled">Assignee</MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueAssigneesMenu
            :assignees="issue.assignees ?? []"
            :disabled="disabled"
            @add="onAssigneeAdd"
            @remove="onAssigneeRemove"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled">Labels</MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueLabelsMenu
            :workspace-id="workspaceId"
            :disabled="disabled"
            :model-value="labelIds"
            @update:model-value="onLabelsUpdate"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled">
          {{ issue.dueDate ? "Change due date" : "Set due date" }}
        </MenuSubTrigger>
        <MenuSubContent class="p-0 w-72">
          <IssueDueDateMenu :due-date="issue.dueDate" :disabled="disabled" @change="onDueDateChange" />
        </MenuSubContent>
      </MenuSub>

      <MenuItem :disabled="disabled" @click="renameOpen = true">Rename</MenuItem>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled"> Mark as sub-issue of… </MenuSubTrigger>
        <MenuSubContent class="w-96">
          <IssueSubIssueMenu :issue="issue" :disabled="disabled" />
        </MenuSubContent>
      </MenuSub>

      <MenuSeparator />

      <MenuItem :disabled="disabled" variant="destructive" @click="deleteOpen = true">Delete</MenuItem>
    </MenuContent>
  </Menu>

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
