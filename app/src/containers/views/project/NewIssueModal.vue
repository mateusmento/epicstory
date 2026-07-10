<script setup lang="ts">
import { IssueLabelTags } from "@/containers/issue";
import { staticMentionView } from "@/containers/issue/map-issue-mention-view";
import { WorkspaceMemberMenu } from "@/containers/workspace-members";
import { Button, DialogClose, Label, Menu, MenuContent, MenuTrigger, Switch } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useBacklog } from "@/domain/backlog";
import { useProjectContext } from "@/domain/project";
import { useWorkspace } from "@/domain/workspace";
import { IssueStatusDropdown, PriorityToggler, issueStatusDotClass } from "@/presentationals/issue";
import { RichTextComposer } from "@/presentationals/rich-text";
import { UserAvatarStack } from "@/presentationals/user";
import type { IssueType, IUser } from "@epicstory/contracts";
import { EMPTY_TIPTAP_DOC, normalizeTiptapDoc } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";

const props = defineProps<{
  projectId: number;
}>();

const { backlogItems, createBacklogItem, updateIssue, addAssignee, addLabel } = useBacklog();
const { user: authUser } = useAuth();
const { workspace, members } = useWorkspace();
const { ensureProjectContext, projectFor } = useProjectContext();

const project = projectFor(() => props.projectId);

const title = ref("");
const titleInput = ref<HTMLInputElement | null>(null);
/** Rich text description (TipTap JSON); set via RichTextComposer. */
const descriptionEditor = shallowRef<Editor | null>(null);

const mentionables = computed<IUser[]>(() => members.value.map((m) => m.user));
const mentionView = computed(() => staticMentionView(mentionables.value));

function setDescriptionEditor(ed: Editor | null) {
  descriptionEditor.value = ed;
}

const status = ref("todo");
const issueType = ref<IssueType>("task");
const priority = ref(0);
const selectedAssignees = ref<IUser[]>([]);
const createMore = ref(false);
const isSubmitting = ref(false);
const closeBtn = ref<HTMLButtonElement | null>(null);
const selectedLabelIds = ref<number[]>([]);

const workspaceId = computed(() => workspace.value?.id ?? 0);

const projectKeyLabel = computed(() => project.value?.issueKeyPrefix?.trim() || "…");

const isEpic = computed({
  get: () => issueType.value === "epic",
  set: (on: boolean) => {
    issueType.value = on ? "epic" : "task";
  },
});

const statusTriggerLabel: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "In progress",
  done: "Done",
};

const afterOf = computed(() => {
  return backlogItems.value.length > 0 ? backlogItems.value[backlogItems.value.length - 1].id : undefined;
});

onMounted(() => {
  ensureProjectContext(props.projectId);
});

function onStatusSelect(next: string) {
  status.value = next;
}

function onFormKeydown(ev: KeyboardEvent) {
  if (!(ev.metaKey || ev.ctrlKey) || ev.key !== "Enter") return;
  if (!title.value.trim() || isSubmitting.value) return;
  ev.preventDefault();
  void onCreateIssue();
}

async function onCreateIssue() {
  if (!title.value.trim()) return;
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const descriptionJson = normalizeTiptapDoc(
      (descriptionEditor.value?.getJSON() ?? EMPTY_TIPTAP_DOC) as JSONContent,
    );

    const item = await createBacklogItem(props.projectId, {
      title: title.value.trim(),
      description: descriptionJson,
      afterOf: afterOf.value,
    });

    // Apply modal-selected fields after creation (backend create backlog-item only supports title/description today).
    await updateIssue(item.issue.id, {
      status: status.value,
      priority: priority.value,
      issueType: issueType.value,
    });

    if (selectedAssignees.value.length > 0) {
      for (const assignee of selectedAssignees.value) {
        await addAssignee(item.issue.id, assignee.id);
      }
    }

    if (selectedLabelIds.value.length > 0) {
      for (const id of selectedLabelIds.value) {
        await addLabel(item.issue.id, id);
      }
    }

    if (createMore.value) {
      title.value = "";
      descriptionEditor.value?.commands.setContent(EMPTY_TIPTAP_DOC, { emitUpdate: false });
      status.value = "todo";
      issueType.value = "task";
      priority.value = 0;
      selectedAssignees.value = [];
      selectedLabelIds.value = [];
      await nextTick();
      titleInput.value?.focus();
    } else {
      closeBtn.value?.click();
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-3 min-w-0">
    <DialogClose as-child>
      <button ref="closeBtn" type="button" class="hidden" />
    </DialogClose>

    <div class="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground w-fit">
      <span class="font-medium text-foreground tabular-nums">{{ projectKeyLabel }}</span>
      <span>·</span>
      <span>New issue</span>
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="onCreateIssue" @keydown="onFormKeydown">
      <div class="flex flex-col gap-1.5">
        <label for="new-issue-title" class="sr-only">Title</label>
        <input
          id="new-issue-title"
          ref="titleInput"
          v-model="title"
          class="w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none"
          placeholder="Issue title"
          autofocus
        />
        <div class="w-full text-sm text-foreground outline-none [&_.ProseMirror]:min-h-[4.5rem]">
          <RichTextComposer
            :mention="mentionView"
            :me-id="authUser?.id"
            placeholder="Add description…"
            @update:editor="setDescriptionEditor"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <IssueStatusDropdown :value="status" @select="onStatusSelect">
          <Button type="button" variant="outline" size="icon" class="gap-2 font-normal">
            <span class="h-2 w-2 rounded-full ring-1 ring-border" :class="issueStatusDotClass(status)" />
            {{ statusTriggerLabel[status] ?? status }}
            <!-- <Icon name="oi-chevron-down" class="h-3 w-3 text-muted-foreground" /> -->
          </Button>
        </IssueStatusDropdown>

        <PriorityToggler v-model:value="priority" />

        <Menu type="dropdown-menu">
          <MenuTrigger as-child>
            <Button type="button" variant="outline" size="icon" class="gap-2 font-normal">
              <UserAvatarStack
                v-if="selectedAssignees.length > 0"
                :users="selectedAssignees"
                size="xs"
                :min="1"
                :overlap-px="7"
                class="min-w-0 shrink"
              />
              <Icon v-else name="oi-person" class="h-4 w-4 text-muted-foreground" />
              Assignee
            </Button>
          </MenuTrigger>
          <MenuContent as-child>
            <WorkspaceMemberMenu
              v-model:users="selectedAssignees"
              selected-label="Assignees"
              search-placeholder="Search assignees…"
              :exclude-user-ids="authUser ? [authUser.id] : []"
            />
          </MenuContent>
        </Menu>

        <div class="flex items-center gap-2">
          <Switch id="new-issue-epic" v-model:checked="isEpic" />
          <Label for="new-issue-epic" class="text-xs font-normal text-muted-foreground">Epic</Label>
        </div>

        <IssueLabelTags v-model="selectedLabelIds" :disabled="workspaceId === 0" />
      </div>

      <div class="flex items-center justify-between gap-2 border-t pt-2.5">
        <div class="flex items-center gap-2">
          <Switch id="new-issue-create-more" v-model:checked="createMore" />
          <Label for="new-issue-create-more" class="text-xs font-normal text-muted-foreground">
            Create more
          </Label>
        </div>

        <Button type="submit" size="sm" :disabled="isSubmitting || !title.trim()">
          {{ isSubmitting ? "Creating…" : "Create issue" }}
        </Button>
      </div>
    </form>
  </div>
</template>
