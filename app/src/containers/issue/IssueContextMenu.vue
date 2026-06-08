<script setup lang="ts">
import { WorkspaceMemberMenu } from "@/containers/workspace-members";
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
import type { IIssue, IUser as IUser } from "@epicstory/contracts";
import { CalendarClock, GitBranch, Kanban, SquarePen, Tags, Trash2Icon, UserIcon } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import IssueDeleteDialog from "@/presentationals/issue/IssueDeleteDialog.vue";
import IssueDueDateMenu from "@/presentationals/issue/IssueDueDateMenu.vue";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";
import IssuePickerMenu from "./IssuePickerMenu.vue";
import IssueRenameDialog from "@/presentationals/issue/IssueRenameDialog.vue";
import IssueStatusMenu from "@/presentationals/issue/status/IssueStatusMenu.vue";

const props = defineProps<{
  issue: IIssue;
  disabled?: boolean;
}>();

const renameOpen = ref(false);
const deleteOpen = ref(false);
const labelIds = computed(() => (props.issue?.labels ?? []).map((l) => l.id));

const { addLabel, removeLabel, updateIssue, addAssignee, removeAssignee, removeIssue, markAsSubIssueOf } =
  useBacklog();

const assigneeUsers = ref<IUser[]>([]);
watch(
  () => props.issue?.assignees,
  (a) => {
    assigneeUsers.value = a ? [...a] : [];
  },
  { immediate: true, deep: true },
);

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

    <MenuContent class="w-64 font-dmSans">
      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <Kanban class="size-4 text-muted-foreground" />
          <span>Status</span>
        </MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueStatusMenu :value="issue.status" @select="updateIssue(issue.id, { status: $event })" />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <UserIcon class="size-4 text-muted-foreground" />
          <span>Assignee</span>
        </MenuSubTrigger>
        <MenuSubContent as-child>
          <WorkspaceMemberMenu
            v-model:users="assigneeUsers"
            selected-label="Assignees"
            search-placeholder="Search assignees…"
            :disabled="disabled"
            @add="addAssignee(issue.id, $event.id)"
            @remove="removeAssignee(issue.id, $event.id)"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <Tags class="size-4 text-muted-foreground" />
          <span>Labels</span>
        </MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueLabelsMenu
            :disabled="disabled"
            :model-value="labelIds"
            @update:model-value="onLabelsUpdate"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <CalendarClock class="size-4 text-muted-foreground" />
          <span>{{ issue.dueDate ? "Change due date" : "Set due date" }}</span>
        </MenuSubTrigger>
        <MenuSubContent class="p-0">
          <IssueDueDateMenu
            :due-date="issue.dueDate"
            :disabled="disabled"
            @change="updateIssue(props.issue.id, { dueDate: $event })"
          />
        </MenuSubContent>
      </MenuSub>

      <MenuItem :disabled="disabled" @click="renameOpen = true">
        <SquarePen class="text-muted-foreground" />
        <span>Rename</span>
      </MenuItem>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <GitBranch class="size-4 text-muted-foreground" />
          <span>Mark as sub-issue of…</span>
        </MenuSubTrigger>
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

      <MenuItem :disabled="disabled" variant="destructive" @click="deleteOpen = true">
        <Trash2Icon />
        <span>Delete</span>
      </MenuItem>
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
