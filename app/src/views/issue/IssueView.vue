<script lang="ts" setup>
import {
  IssueAttachmentsStrip,
  IssueDescriptionEditor,
  IssueGithubSidebarSection,
  IssueLabelTags,
} from "@/containers/issue";
import { mapIssueMentionView, onlineUserIdsFrom } from "@/containers/issue/map-issue-mention-view";
import { provideIssueAttachmentsContext } from "@/containers/issue/issue-attachments.context";
import IssueActivitySection from "@/containers/views/issue/IssueActivitySection.vue";
import SubIssuesSection from "@/containers/views/issue/SubIssuesSection.vue";
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import { Button, Input, Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useWorkspaceOnline } from "@/domain/channels";
import { useIssue, useIssueAttachments } from "@/domain/issues";
import { useScopedWorkspaceMemberSearch } from "@/domain/workspace";
import { IssueKey, IssueStatusDropdown } from "@/presentationals/issue";
import { issueStatusDotClass } from "@/presentationals/issue/status/status-fns";
import { UserAvatarStack } from "@/presentationals/user";
import { DueDatePicker } from "@/presentationals/views/project/backlog/date-picker";
import { PriorityToggler } from "@/presentationals/views/project/backlog/priority-toggler";
import type { IUser, UpdateIssueData } from "@epicstory/contracts";
import { computed, onMounted, reactive, ref, watch } from "vue";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  issueId: string;
}>();

const { user } = useAuth();

const { issue, patchMutation, fetchIssue, patchIssue, addAssignee, removeAssignee, addLabel, removeLabel } =
  useIssue();

const issueAttachments = useIssueAttachments({
  issueId: () => +props.issueId,
  reloadFeed: reloadIssueActivityFeed,
});

provideIssueAttachmentsContext(issueAttachments);

const { isUserOnline } = useWorkspaceOnline();

const memberSearch = useScopedWorkspaceMemberSearch();

watch(
  () => issue.value?.workspaceId,
  (wid) => {
    if (wid != null) memberSearch.search(wid, "");
  },
  { immediate: true },
);

const workspaceMentionUsers = computed(() => memberSearch.items.map((m) => m.user));

const issueMentionView = computed(() =>
  mapIssueMentionView({
    mentionables: workspaceMentionUsers.value,
    loading: memberSearch.loading,
    loadingMore: memberSearch.loadingMore,
    hasMore: memberSearch.hasMore,
    onlineUserIds: onlineUserIdsFrom(workspaceMentionUsers.value, isUserOnline),
  }),
);

async function onWorkspaceMentionListReachedBottom() {
  const wid = issue.value?.workspaceId;
  if (wid == null) return;
  await memberSearch.loadMore(wid);
}

const activitySectionRef = ref<{ reloadFeed: () => Promise<void> } | null>(null);

async function reloadIssueActivityFeed() {
  await activitySectionRef.value?.reloadFeed?.();
}

const assigneeUsers = ref<IUser[]>([]);
watch(
  () => issue.value?.assignees,
  (a) => {
    assigneeUsers.value = a ? [...a] : [];
  },
  { immediate: true, deep: true },
);

const titleEl = ref<HTMLInputElement | null>(null);

const isEditingTitle = ref(false);

const form = reactive({
  title: "",
});

watch(
  issue,
  (iss) => {
    if (!iss) return;
    form.title = iss.title ?? "";
  },
  { immediate: true },
);

watch(
  () => props.issueId,
  () => refreshIssue(),
  { immediate: true },
);

async function refreshIssue() {
  await fetchIssue(+props.issueId);
}

function saveMainFields() {
  if (!issue.value) return;
  const data: Pick<UpdateIssueData, "title"> = {};
  if (form.title !== issue.value.title) data.title = form.title;
  if (Object.keys(data).length === 0) return;
  patchIssue(data);
}

function startEditTitle() {
  if (!issue.value) return;
  isEditingTitle.value = true;
  // allow DOM to render the input
  queueMicrotask(() => titleEl.value?.focus?.());
}

function cancelEditTitle() {
  if (!issue.value) return;
  form.title = issue.value.title ?? "";
  isEditingTitle.value = false;
}

function finishEditTitle() {
  if (!issue.value) return;
  isEditingTitle.value = false;
  saveMainFields();
}

function onTitleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    finishEditTitle();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelEditTitle();
  }
}

async function onSaveDescription(description: any) {
  if (!issue.value) return;
  await patchIssue({ description });
  await issueAttachments.loadAttachments();
}

onMounted(() => {
  refreshIssue();
});
</script>

<template>
  <div class="flex:col-lg mx-auto max-w-5xl w-full px-6 py-8">
    <div class="flex:row-xl flex:center-y">
      <div class="flex:col-sm">
        <div class="text-xs text-secondary-foreground">
          <span class="font-medium">{{ issue?.project?.name ?? "Project" }}</span>
          <span class="mx-2">/</span>
          <IssueKey
            v-if="issue?.issueKey"
            :issue-key="issue.issueKey"
            copyable
            size="sm"
            class="text-foreground/80"
          />
          <span v-else class="text-foreground/80">Issue #{{ props.issueId }}</span>
        </div>
      </div>

      <div class="flex-1" />

      <div class="flex:row-md flex:center-y">
        <div v-if="patchMutation.busy" class="text-xs text-secondary-foreground">Saving…</div>
        <Button variant="outline" size="sm" :disabled="!issue || patchMutation.busy" @click="saveMainFields"
          >Save</Button
        >
      </div>
    </div>

    <div v-if="patchMutation.error" class="text-sm text-red-600">{{ patchMutation.error }}</div>

    <div class="grid grid-cols-[1fr_280px] items-start gap-6">
      <!-- Main -->
      <div class="flex:col-lg">
        <div class="flex:col-sm">
          <div v-if="!isEditingTitle" class="select-none">
            <div
              class="text-2xl font-semibold text-foreground leading-tight cursor-text rounded-md px-2 -mx-2 hover:bg-muted/50"
              @dblclick="startEditTitle"
              title="Double-click to edit"
            >
              {{ issue?.title || "Untitled issue" }}
            </div>
          </div>
          <div v-else>
            <Input
              ref="titleEl"
              v-model="form.title"
              size="lg"
              placeholder="Issue title"
              class="font-semibold border-transparent shadow-none bg-transparent px-2 -mx-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              :disabled="!issue"
              @blur="finishEditTitle"
              @keydown="onTitleKeydown"
            />
          </div>
        </div>

        <IssueDescriptionEditor
          :key="props.issueId"
          :description="issue?.description ?? { type: 'doc', content: [{ type: 'paragraph', content: [] }] }"
          :issue-id="+props.issueId"
          :disabled="!issue"
          :is-saving="patchMutation.busy"
          :mention="issueMentionView"
          :me-id="user?.id"
          @mention-load-more="onWorkspaceMentionListReachedBottom"
          @save-description="onSaveDescription"
        />

        <SubIssuesSection
          v-if="issue"
          :workspace-id="props.workspaceId"
          :project-id="props.projectId"
          :parent-issue-id="issue.id"
          :sub-issues="issue.subIssues ?? []"
          :disabled="!issue"
          @changed="refreshIssue"
        />

        <IssueAttachmentsStrip v-if="issue && user" :me-id="user.id" droppable class="mt-8" />

        <IssueActivitySection
          v-if="issue && user"
          ref="activitySectionRef"
          :issue-id="issue.id"
          :comment-channel-id="issue.commentChannelId"
          :mention="issueMentionView"
          :me-id="user.id"
          @mention-load-more="onWorkspaceMentionListReachedBottom"
        />
      </div>

      <!-- Sidebar -->
      <div class="flex:col-xl">
        <div class="flex:col-xl p-4 border rounded-xl bg-card shadow-sm">
          <div class="text-sm font-medium text-foreground">Details</div>

          <div class="flex:col-sm">
            <div class="text-xs text-secondary-foreground">Status</div>

            <IssueStatusDropdown :value="issue?.status ?? 'todo'" @select="patchIssue({ status: $event })">
              <div class="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  class="w-2.5 h-2.5 rounded-full ring-1 ring-border"
                  :class="issue?.status && issueStatusDotClass(issue.status)"
                  :title="issue?.status"
                />
                <span class="text-xs text-muted-foreground tabular-nums shrink-0 capitalize">
                  {{ issue?.status }}
                </span>
              </div>
            </IssueStatusDropdown>
          </div>

          <!-- Row: Assignees + Project -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex:col-sm min-w-0">
              <div class="text-xs text-secondary-foreground">Project</div>
              <Tooltip>
                <TooltipTrigger>
                  <div class="text-sm font-medium text-foreground truncate">
                    {{ issue?.project?.name ?? `#${props.projectId}` }}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {{ issue?.project?.name ?? `#${props.projectId}` }}
                </TooltipContent>
              </Tooltip>
            </div>

            <div class="flex:col-sm min-w-0">
              <div class="text-xs text-secondary-foreground">Assignees</div>
              <WorkspaceMemberDropdown
                v-model:users="assigneeUsers"
                selected-label="Assignees"
                search-placeholder="Search assignees…"
                :disabled="!issue"
                @add="(u) => addAssignee(u.id)"
                @remove="(u) => removeAssignee(u.id)"
                #default="{ users }"
              >
                <div class="flex min-w-0 w-full items-center cursor-pointer">
                  <UserAvatarStack
                    v-if="users.length"
                    :users="users"
                    size="md"
                    :min="1"
                    :overlap-px="4"
                    class="min-w-0 flex-1 basis-32"
                  />

                  <Button
                    v-if="users.length === 0"
                    variant="ghost"
                    size="icon"
                    class="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Icon name="fa-user-plus" class="h-4 w-4 shrink-0" />
                  </Button>
                </div>
              </WorkspaceMemberDropdown>
            </div>
          </div>

          <!-- Row: Priority + Due date -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex:col-sm min-w-0">
              <div class="text-xs text-secondary-foreground">Priority</div>
              <div class="min-w-0">
                <PriorityToggler
                  :value="issue?.priority ?? 0"
                  @update:value="patchIssue({ priority: $event })"
                />
              </div>
            </div>

            <div class="flex:col-sm min-w-0">
              <div class="flex:row-md flex:center-y min-w-0">
                <div class="text-xs text-secondary-foreground">Due date</div>
                <div class="flex-1" />
                <Button
                  v-if="issue?.dueDate"
                  variant="ghost"
                  size="xs"
                  class="text-xs"
                  :disabled="patchMutation.busy"
                  @click="patchIssue({ dueDate: null })"
                >
                  Clear
                </Button>
              </div>
              <div class="min-w-0">
                <DueDatePicker
                  :model-value="issue?.dueDate ?? undefined"
                  size="badge"
                  :disabled="!issue"
                  @update:model-value="patchIssue({ dueDate: $event })"
                />
              </div>
            </div>
          </div>

          <!-- Labels -->
          <div class="flex:col-sm">
            <div class="text-xs text-secondary-foreground">Labels</div>
            <div class="flex flex-wrap items-center gap-1.5">
              <IssueLabelTags
                :disabled="!issue"
                :model-value="(issue?.labels ?? []).map((l) => l.id)"
                @add-label="addLabel"
                @remove-label="removeLabel"
              />
            </div>
          </div>

          <!-- GitHub: composable + sidebar child keeps IssueView thin -->
          <IssueGithubSidebarSection
            v-if="issue"
            :issue="issue"
            :reload-issue-activity-feed="reloadIssueActivityFeed"
            :reload-issue="refreshIssue"
          />

          <IssueAttachmentsStrip
            v-if="issue && user"
            :me-id="user.id"
            compact
            droppable
            class="mt-2 border-t border-border pt-4"
          />
        </div>
      </div>
    </div>
  </div>
</template>
