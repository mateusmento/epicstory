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
import { useProjectContext } from "@/domain/project";
import { useSprint } from "@/domain/sprint";
import type { IIssue, IssueType, IUser as IUser } from "@epicstory/contracts";
import {
  CalendarClock,
  GitBranch,
  Kanban,
  Layers2,
  Share2,
  SquarePen,
  Tags,
  TimerIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-vue-next";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi } from "@epicstory/api-client";
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";
import IssueDeleteDialog from "@/presentationals/issue/IssueDeleteDialog.vue";
import IssueDueDateMenu from "@/presentationals/issue/IssueDueDateMenu.vue";
import IssueLabelsMenu from "./IssueLabelsMenu.vue";
import IssuePickerMenu from "./IssuePickerMenu.vue";
import IssueRenameDialog from "@/presentationals/issue/IssueRenameDialog.vue";
import IssueStatusMenu from "@/presentationals/issue/status/IssueStatusMenu.vue";
import ShareToChannelSubmenu from "@/containers/channel/ShareToChannelSubmenu.vue";

const props = defineProps<{
  issue: IIssue;
  disabled?: boolean;
}>();

const issueApi = useDependency(IssueApi);
const { ensureProjectContext } = useProjectContext();
const { sprints, sprintItems, fetchSprints, fetchSprintItems, removeSprintItem } = useSprint();

const renameOpen = ref(false);
const deleteOpen = ref(false);
const nestedCount = ref(0);
const isTogglingEpic = ref(false);
const scopedSprintItem = ref<{ itemId: number; sprintId: number } | null>(null);
const resolvingSprintScope = ref(false);
const labelIds = computed(() => (props.issue?.labels ?? []).map((l) => l.id));
const isEpic = computed(() => props.issue.issueType === "epic");
const epicToggleLabel = computed(() => (isEpic.value ? "Unmark as epic" : "Mark as epic"));

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

function epicToggleErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(response)) return response.join(", ");
  if (typeof response === "string") return response;
  return "Could not update issue type";
}

async function toggleEpicType() {
  if (isTogglingEpic.value || props.disabled) return;
  const nextType: IssueType = isEpic.value ? "task" : "epic";
  isTogglingEpic.value = true;
  try {
    await updateIssue(props.issue.id, { issueType: nextType });
  } catch (error) {
    toast.error(epicToggleErrorMessage(error));
  } finally {
    isTogglingEpic.value = false;
  }
}

async function resolveSprintScope() {
  resolvingSprintScope.value = true;
  scopedSprintItem.value = null;
  try {
    const project = await ensureProjectContext(props.issue.projectId);
    if (!project.teamId) return;

    await fetchSprints(project.teamId);
    const candidates = sprints.value.filter((s) => s.status === "active" || s.status === "planned");
    for (const sprint of candidates) {
      let items = sprintItems.value.get(sprint.id);
      if (!items) {
        items = await fetchSprintItems(sprint.id);
      }
      const found = items.find((item) => item.issue?.id === props.issue.id);
      if (found) {
        scopedSprintItem.value = { itemId: found.id, sprintId: sprint.id };
        return;
      }
    }
  } catch {
    scopedSprintItem.value = null;
  } finally {
    resolvingSprintScope.value = false;
  }
}

async function onMenuOpen(open: boolean) {
  if (!open) {
    scopedSprintItem.value = null;
    return;
  }
  await resolveSprintScope();
}

async function onRemoveFromSprint() {
  const scoped = scopedSprintItem.value;
  if (!scoped || props.disabled) return;
  await removeSprintItem(scoped.itemId, scoped.sprintId);
  scopedSprintItem.value = null;
}

watch(deleteOpen, async (open) => {
  if (!open) return;
  nestedCount.value = props.issue.subIssues?.length ?? 0;
  try {
    const { count } = await issueApi.countIssueDescendants(props.issue.id);
    nestedCount.value = count;
  } catch {
    // Keep direct-child fallback when the count endpoint fails.
  }
});

async function onConfirmDelete(payload: { deleteSubIssues: boolean }) {
  await removeIssue(props.issue.id, payload);
}
</script>

<template>
  <Menu type="context-menu" @update:open="onMenuOpen">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>

    <MenuContent class="w-64 font-dmSans">
      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <Kanban class="size-4 text-muted-foreground" />
          <div>Status</div>
        </MenuSubTrigger>
        <MenuSubContent as-child>
          <IssueStatusMenu :value="issue.status" @select="updateIssue(issue.id, { status: $event })" />
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <UserIcon class="size-4 text-muted-foreground" />
          <div>Assignee</div>
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
          <div>Labels</div>
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
          <div>{{ issue.dueDate ? "Change due date" : "Set due date" }}</div>
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
        <div>Rename</div>
      </MenuItem>

      <MenuItem :disabled="disabled || isTogglingEpic" @click="toggleEpicType">
        <Layers2 class="size-4 text-muted-foreground" />
        <div>{{ epicToggleLabel }}</div>
      </MenuItem>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <GitBranch class="size-4 text-muted-foreground" />
          <div>Mark as sub-issue of…</div>
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

      <MenuItem
        v-if="scopedSprintItem"
        :disabled="disabled || resolvingSprintScope"
        @click="onRemoveFromSprint"
      >
        <TimerIcon class="size-4 text-muted-foreground" />
        <div>Remove from sprint</div>
      </MenuItem>

      <MenuSub>
        <MenuSubTrigger :disabled="disabled" class="flex:row-md text-sm">
          <Share2 class="size-4 text-muted-foreground" />
          <div>Share to channel</div>
        </MenuSubTrigger>
        <MenuSubContent class="p-0">
          <ShareToChannelSubmenu mode="issue" :issue="issue" :disabled="disabled" />
        </MenuSubContent>
      </MenuSub>

      <MenuSeparator />

      <MenuItem :disabled="disabled" intent="destructive" @click="deleteOpen = true">
        <Trash2Icon />
        <div>Delete</div>
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
    :nested-count="nestedCount"
    :disabled="disabled"
    @update:open="deleteOpen = $event"
    @confirm="onConfirmDelete"
  />
</template>
