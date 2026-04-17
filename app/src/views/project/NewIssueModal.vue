<script setup lang="ts">
import { IssueAssigneesMenu, IssueLabelTags } from "@/components/issue";
import { UserAvatar } from "@/components/user";
import {
  Button,
  DialogClose,
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Switch,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useBacklog } from "@/domain/backlog";
import type { Label } from "@/domain/labels";
import { useLabels } from "@/domain/labels";
import type { User } from "@/domain/user";
import { useWorkspace } from "@/domain/workspace";
import { computed, ref } from "vue";

const props = defineProps<{
  projectId: number;
}>();

const { backlogItems, createBacklogItem, updateIssue, addAssignee, addLabel } = useBacklog();
const { workspace } = useWorkspace();
const { labelsById } = useLabels();

const title = ref("");
const description = ref("");
const status = ref<"todo" | "doing" | "done">("todo");
const priority = ref<number>(0);
const selectedAssignees = ref<User[]>([]);
const createMore = ref(false);
const isSubmitting = ref(false);
const closeBtn = ref<HTMLButtonElement | null>(null);
const selectedLabelIds = ref<number[]>([]);

const workspaceId = computed(() => workspace.value?.id ?? 0);

const selectedLabels = computed(() => {
  return selectedLabelIds.value
    .map((id) => labelsById.value.get(id))
    .filter((l): l is Label => Boolean(l))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const afterOf = computed(() => {
  return backlogItems.value.length > 0 ? backlogItems.value[backlogItems.value.length - 1].id : undefined;
});

function addSelectedAssignee(assignee: User) {
  if (selectedAssignees.value.some((a) => a.id === assignee.id)) return;
  selectedAssignees.value.push(assignee);
}

function removeSelectedAssignee(assignee: User) {
  selectedAssignees.value = selectedAssignees.value.filter((a) => a.id !== assignee.id);
}

function statusDotClass(s: string) {
  if (s === "doing") return "bg-blue-500";
  if (s === "done") return "bg-emerald-500";
  if (s === "todo") return "bg-zinc-300";
  return "bg-zinc-400";
}

const statusLabel: Record<string, string> = {
  todo: "Todo",
  doing: "Doing",
  done: "Done",
};

const priorityLabel = ["No priority", "Low", "Medium", "High", "Urgent"];

async function onCreateIssue() {
  if (!title.value.trim()) return;
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const item = await createBacklogItem(props.projectId, {
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      afterOf: afterOf.value,
    });

    // Apply modal-selected fields after creation (backend create backlog-item only supports title/description today).
    await updateIssue(item.issue.id, {
      status: status.value,
      priority: priority.value,
    });

    if (selectedAssignees.value.length > 0) {
      for (const assignee of selectedAssignees.value) {
        await addAssignee(item.issue.id, assignee.id);
      }
    }

    if (selectedLabelIds.value.length > 0) {
      // labels are workspace-scoped; attach them after creation
      for (const id of selectedLabelIds.value) {
        await addLabel(item.issue.id, id);
      }
    }

    if (createMore.value) {
      title.value = "";
      description.value = "";
      status.value = "todo";
      priority.value = 0;
      selectedAssignees.value = [];
      selectedLabelIds.value = [];
    } else {
      closeBtn.value?.click();
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="w-[720px] max-w-[calc(100vw-2rem)] rounded-lg bg-white !p-0">
    <!-- Hidden close trigger so we can close programmatically -->
    <DialogClose as-child>
      <button ref="closeBtn" type="button" class="hidden" />
    </DialogClose>

    <!-- Header -->
    <div class="flex items-center justify-between px-3 pt-3">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
          <span class="font-medium text-foreground">EP</span>
          <span>·</span>
          <span>New issue</span>
        </div>
      </div>

      <div class="flex items-center gap-1 text-muted-foreground">
        <Button variant="ghost" size="icon" class="h-7 w-7" title="Expand (coming soon)">
          <Icon name="bi-chevron-expand" class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Body -->
    <form class="px-3 pb-3" @submit.prevent="onCreateIssue">
      <input
        v-model="title"
        class="w-full text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none"
        placeholder="Issue title"
        autofocus
      />
      <textarea
        v-model="description"
        rows="3"
        class="mt-1.5 w-full resize-none text-sm text-foreground placeholder:text-muted-foreground outline-none"
        placeholder="Add description…"
      />

      <!-- Chips row -->
      <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
        <!-- Status -->
        <Menu>
          <MenuTrigger as-child>
            <Button variant="outline" size="badge" class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ring-1 ring-border" :class="statusDotClass(status)" />
              {{ statusLabel[status] }}
              <Icon name="oi-chevron-down" class="w-3 h-3 text-muted-foreground" />
            </Button>
          </MenuTrigger>
          <MenuContent align="start" class="w-44">
            <MenuRadioGroup v-model="status">
              <MenuRadioItem value="todo">
                <template #indicator>
                  <div class="w-2 h-2 rounded-full ring-1 ring-border" :class="statusDotClass('todo')" />
                </template>
                Todo
              </MenuRadioItem>
              <MenuRadioItem value="doing">
                <template #indicator>
                  <div class="w-2 h-2 rounded-full ring-1 ring-border" :class="statusDotClass('doing')" />
                </template>
                Doing
              </MenuRadioItem>
              <MenuRadioItem value="done">
                <template #indicator>
                  <div class="w-2 h-2 rounded-full ring-1 ring-border" :class="statusDotClass('done')" />
                </template>
                Done
              </MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </Menu>

        <!-- Priority (simple cycler to match Linear "chip") -->
        <Button
          type="button"
          variant="outline"
          size="badge"
          class="flex items-center gap-2"
          @click="priority = priority === 4 ? 0 : priority + 1"
        >
          <Icon name="md-signalcellularalt-round" class="w-4 h-4 text-muted-foreground" />
          {{ priorityLabel[priority] ?? "Priority" }}
        </Button>

        <!-- Assignee -->
        <Menu type="dropdown-menu">
          <MenuTrigger as-child>
            <Button type="button" variant="outline" size="badge" class="flex items-center gap-2">
              <div v-if="selectedAssignees.length > 0" class="flex:row flex:center-y">
                <UserAvatar
                  v-for="(assignee, i) in selectedAssignees"
                  :key="assignee.id"
                  :name="assignee.name"
                  :picture="assignee.picture"
                  size="xs"
                  :class="cn(i > 0 && 'ml-[-0.45rem]')"
                />
              </div>
              <Icon v-else name="oi-person" class="w-4 h-4 text-muted-foreground" />
              Assignee
            </Button>
          </MenuTrigger>
          <MenuContent as-child>
            <IssueAssigneesMenu
              :assignees="selectedAssignees"
              @add="addSelectedAssignee"
              @remove="removeSelectedAssignee"
            >
            </IssueAssigneesMenu>
          </MenuContent>
        </Menu>

        <!-- Labels -->
        <IssueLabelTags v-model="selectedLabelIds" :disabled="workspaceId === 0" />
      </div>

      <!-- Footer -->
      <div class="mt-3 flex items-center justify-between border-t pt-2.5">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch v-model:checked="createMore" />
          <span>Create more</span>
        </div>

        <Button type="submit" size="sm" :disabled="isSubmitting || !title.trim()">
          {{ isSubmitting ? "Creating…" : "Create issue" }}
        </Button>
      </div>
    </form>
  </div>
</template>
