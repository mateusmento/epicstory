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
import { useBacklog } from "@/domain/backlog";
import type { Issue } from "@/domain/issues";
import { computed, ref } from "vue";
import IssueAssigneesMenu from "./IssueAssigneesMenu.vue";
import IssueDeleteDialog from "./IssueDeleteDialog.vue";
import IssueDueDateMenu from "./IssueDueDateMenu.vue";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";
import IssuePickerMenu from "./IssuePickerMenu.vue";
import IssueRenameDialog from "./IssueRenameDialog.vue";
import IssueStatusMenu from "./status/IssueStatusMenu.vue";

const props = defineProps<{
  issue: Issue;
  disabled?: boolean;
}>();

const renameOpen = ref(false);
const deleteOpen = ref(false);
const labelIds = computed(() => (props.issue?.labels ?? []).map((l) => l.id));

const { addLabel, removeLabel, updateIssue, addAssignee, removeAssignee, removeIssue, markAsSubIssueOf } =
  useBacklog();

async function onLabelsUpdate(nextIds: number[]) {
  const prev = new Set(labelIds.value);
  const next = new Set(nextIds);

  for (const id of next) {
    if (!prev.has(id)) {
      await addLabel(props.issue.id, id);
    }
  }

  for (const id of prev) {
    if (!next.has(id)) {
      await removeLabel(props.issue.id, id);
    }
  }
}
</script>

<template>
  <Menu type="context-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>

    <MenuContent class="w-64">
      <MenuSub>
        <MenuSubTrigger :disabled="disabled">Status</MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueStatusMenu :value="issue.status" @select="updateIssue(issue.id, { status: $event })" />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled">Assignee</MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueAssigneesMenu
            :assignees="issue.assignees ?? []"
            :disabled="disabled"
            @add="addAssignee(issue.id, $event.id)"
            @remove="removeAssignee(issue.id, $event.id)"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled">Labels</MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueLabelsMenu
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
        <MenuSubContent class="p-0">
          <IssueDueDateMenu
            :due-date="issue.dueDate"
            :disabled="disabled"
            @change="updateIssue(props.issue.id, { dueDate: $event })"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuItem :disabled="disabled" @click="renameOpen = true">Rename</MenuItem>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled"> Mark as sub-issue of… </MenuSubTrigger>
        <MenuSubContent class="w-96">
          <IssuePickerMenu
            :issue="issue.parentIssue"
            :project-id="issue.projectId"
            :disabled="disabled"
            @select="markAsSubIssueOf(issue.id, $event.id)"
            @clear="markAsSubIssueOf(issue.id, null)"
          />
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
    @confirm="updateIssue(props.issue.id, { title: $event })"
  />

  <IssueDeleteDialog
    :open="deleteOpen"
    :title="issue.title ?? ''"
    :disabled="disabled"
    @update:open="deleteOpen = $event"
    @confirm="removeIssue(issue.id)"
  />
</template>
