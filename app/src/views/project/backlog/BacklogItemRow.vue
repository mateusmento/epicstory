<script setup lang="ts">
import LabelMultiSelect from "@/components/labels/LabelMultiSelect.vue";
import { UserSelect } from "@/components/user";
import { Button, ContentEditable, Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import type { Issue } from "@/domain/issues";
import { parseAbsolute } from "@internationalized/date";
import { computed } from "vue";
import { DueDatePicker } from "./date-picker";
import { PriorityToggler } from "./priority-toggler";
import { useBacklogRowContext } from "./backlog-row.context";

const props = defineProps<{
  itemId: number;
  issue: Issue;
  dragging: boolean;
  dragHandleTitle: string;
  dragHandleForceHidden?: boolean;
}>();

const ctx = useBacklogRowContext();

const {
  workspaceId,
  gridColsClass,
  editing,
  actions,
  openIssue,
  startEdit,
  cancelEdit,
  saveEdit,
  toggleStatus,
  statusDotClass,
  onLabelsChange,
} = ctx;

const { updateIssue, addAssignee } = actions;

const isEditing = computed(() => editing.id === props.issue.id);

const titleModel = computed({
  get: () => editing.title,
  set: (v: string) => (editing.title = v),
});

const editableModel = computed({
  get: () => isEditing.value,
  set: (v: boolean) => {
    if (!v) cancelEdit();
  },
});
</script>

<template>
  <div
    class="group grid gap-x-4 items-center px-3 py-2 hover:bg-zinc-50"
    :class="cn(gridColsClass, { 'opacity-70': dragging })"
  >
    <!-- Drag handle -->
    <div
      class="opacity-0 group-hover:opacity-100 transition-opacity"
      :class="cn(props.dragHandleForceHidden && 'opacity-0')"
      :title="dragHandleTitle"
    >
      <Icon name="bi-grip-vertical" class="text-muted-foreground" />
    </div>

    <!-- Status + key -->
    <div class="flex items-center gap-2 min-w-0">
      <button
        type="button"
        class="w-2.5 h-2.5 rounded-full ring-1 ring-border"
        :class="statusDotClass(issue.status)"
        :title="issue.status"
        @click="toggleStatus(issue)"
      />
      <span class="text-xs text-muted-foreground tabular-nums shrink-0"> EP-{{ issue.id }} </span>
    </div>

    <!-- Title -->
    <div class="min-w-0 flex:row-lg flex:center-y">
      <div v-if="!isEditing" class="min-w-0">
        <div class="flex:row-lg flex:center-y min-w-0">
          <Tooltip>
            <TooltipTrigger as-child>
              <div class="min-w-0" @dblclick.stop="openIssue(issue)">
                <div class="truncate text-sm text-foreground flex items-center gap-1 min-w-0">
                  <span class="truncate min-w-0">{{ issue.title }}</span>
                  <template v-if="issue.parentIssue?.title">
                    <Icon name="oi-chevron-right" class="w-3 h-3 text-muted-foreground shrink-0" />
                    <span class="text-muted-foreground truncate max-w-56">{{ issue.parentIssue.title }}</span>
                  </template>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <template v-if="issue.parentIssue?.title">
                {{ issue.title }}
                <Icon name="oi-chevron-right" class="inline w-3 h-3 text-muted-foreground" />
                {{ issue.parentIssue.title }}
              </template>
              <template v-else>
                {{ issue.title }}
              </template>
            </TooltipContent>
          </Tooltip>
          <Icon
            name="fa-regular-edit"
            class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            title="Edit title"
            @click="startEdit(issue)"
          />
        </div>
      </div>

      <div v-else class="flex items-center gap-1 min-w-0">
        <div class="flex items-center gap-1 min-w-0 text-sm">
          <ContentEditable
            v-model="titleModel"
            v-model:editable="editableModel"
            as="div"
            placeholder="Issue title"
            class="inline-block max-w-full whitespace-nowrap bg-transparent outline-none leading-5 text-foreground"
            @submit="saveEdit"
            @cancel="cancelEdit"
          />
          <template v-if="issue.parentIssue?.title">
            <Icon name="oi-chevron-right" class="w-3 h-3 text-muted-foreground shrink-0" />
            <span class="text-muted-foreground truncate max-w-56">{{ issue.parentIssue.title }}</span>
          </template>
        </div>
        <Button type="button" variant="ghost" size="icon" title="Save" @click="saveEdit">
          <Icon name="bi-check" class="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </Button>
        <Button type="button" variant="ghost" size="icon" title="Cancel" @click="cancelEdit">
          <Icon name="io-close" class="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>

      <div v-if="issue.labels?.length" class="mt-0.5 ml-auto flex flex-wrap gap-1 min-w-0">
        <LabelMultiSelect
          :workspace-id="workspaceId"
          :disabled="!issue"
          :model-value="(issue?.labels ?? []).map((l) => l.id)"
          @update:model-value="onLabelsChange(issue, $event)"
        />
      </div>
    </div>

    <!-- Priority -->
    <div class="justify-self-start">
      <PriorityToggler :value="issue.priority" @update:value="updateIssue(issue.id, { priority: $event })" />
    </div>

    <!-- Assignees -->
    <UserSelect @update:model-value="$event && addAssignee(issue.id, $event.id)">
      <template #trigger>
        <div class="flex items-center justify-start">
          <div class="flex items-center">
            <img
              v-for="(assignee, i) of issue.assignees"
              :key="assignee.id"
              :src="assignee.picture"
              class="cursor-pointer w-5 h-5 rounded-full border border-background"
              :class="cn(i > 0 && 'ml-[-0.45rem]')"
            />
          </div>
          <div
            v-if="issue.assignees.length === 0"
            class="ml-1 flex flex:center w-fit p-0.5 cursor-pointer border-2 border-dashed border-secondary-foreground/30 rounded-full group/assignee hover:border-secondary-foreground/60"
            title="Add assignee"
          >
            <Icon
              name="fa-user-plus"
              class="w-4 h-4 text-secondary-foreground/70 group-hover/assignee:text-secondary-foreground"
            />
          </div>
        </div>
      </template>
    </UserSelect>

    <!-- Due date -->
    <div class="justify-self-start">
      <DueDatePicker
        size="badge"
        :modelValue="issue.dueDate ? parseAbsolute(issue.dueDate, 'America/Sao_Paulo') : undefined"
        @update:model-value="
          updateIssue(issue.id, { dueDate: $event?.toDate('America/Sao_Paulo').toString() })
        "
      />
    </div>

    <div class="justify-self-end" />
  </div>
</template>
