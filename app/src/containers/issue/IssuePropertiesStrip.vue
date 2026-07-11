<script setup lang="ts">
import { IssueLabelTags } from "@/containers/issue";
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { IssueStatusDropdown } from "@/presentationals/issue";
import { DueDatePicker } from "@/presentationals/issue/due-date-picker";
import { PriorityToggler } from "@/presentationals/issue/priority-toggler";
import { issueStatusDotClass } from "@/presentationals/issue/status/status-fns";
import { UserAvatarStack } from "@/presentationals/user";
import type { ILabel, IUser } from "@epicstory/contracts";

defineProps<{
  status: string;
  priority: number;
  dueDate?: Date | null;
  labels: ILabel[];
  disabled?: boolean;
  busy?: boolean;
}>();

const assignees = defineModel<IUser[]>("assignees", { required: true });

const emit = defineEmits<{
  (e: "update:status", status: string): void;
  (e: "update:priority", priority: number): void;
  (e: "update:dueDate", dueDate: Date | undefined): void;
  (e: "clear-due-date"): void;
  (e: "add-assignee", user: IUser): void;
  (e: "remove-assignee", user: IUser): void;
  (e: "add-label", labelId: number): void;
  (e: "remove-label", labelId: number): void;
}>();

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "In progress",
  done: "Done",
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <IssueStatusDropdown :value="status" @select="emit('update:status', $event)">
      <Button type="button" variant="outline" size="sm" class="h-8 gap-2 font-normal" :disabled="disabled">
        <span class="h-2 w-2 rounded-full ring-1 ring-border" :class="issueStatusDotClass(status)" />
        {{ STATUS_LABEL[status] ?? status }}
      </Button>
    </IssueStatusDropdown>

    <WorkspaceMemberDropdown
      v-model:users="assignees"
      selected-label="Assignees"
      search-placeholder="Search assignees…"
      density="compact"
      :disabled="disabled"
      @add="emit('add-assignee', $event)"
      @remove="emit('remove-assignee', $event)"
    >
      <Button type="button" variant="outline" size="sm" class="h-8 gap-2 font-normal" :disabled="disabled">
        <UserAvatarStack
          v-if="assignees.length"
          :users="assignees"
          size="xs"
          :min="1"
          :overlap-px="6"
          class="min-w-0 shrink"
        />
        <template v-else>
          <Icon name="fa-user-plus" class="h-3.5 w-3.5 text-muted-foreground" />
          <span class="text-muted-foreground">Assignee</span>
        </template>
      </Button>
    </WorkspaceMemberDropdown>

    <PriorityToggler :value="priority" @update:value="emit('update:priority', $event)" />

    <div class="inline-flex items-center gap-1">
      <DueDatePicker
        :model-value="dueDate ?? undefined"
        size="icon"
        :disabled="disabled"
        @update:model-value="emit('update:dueDate', $event)"
      />
      <Button
        v-if="dueDate"
        type="button"
        variant="ghost"
        size="xs"
        class="text-xs text-muted-foreground"
        :disabled="disabled || busy"
        @click="emit('clear-due-date')"
      >
        Clear
      </Button>
    </div>

    <IssueLabelTags
      :disabled="disabled"
      :issue-labels="labels"
      :model-value="labels.map((l) => l.id)"
      @add-label="emit('add-label', $event)"
      @remove-label="emit('remove-label', $event)"
    />
  </div>
</template>
