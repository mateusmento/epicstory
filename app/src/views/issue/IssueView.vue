<script lang="ts" setup>
import {
  IssueDescriptionEditor,
  IssueLabelTags,
  issueStatusDotClass,
  IssueStatusDropdown,
} from "@/components/issue";
import IssueAttachmentsStrip from "@/components/issue/IssueAttachmentsStrip.vue";
import { UserAvatar } from "@/components/user";
import { WorkspaceMemberDropdown } from "@/components/workspace-members";
import { useDependency } from "@/core/dependency-injection";
import { Button, Input, Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useIssue, useIssueAttachments } from "@/domain/issues";
import type { Project } from "@/domain/project";
import { useScopedWorkspaceMemberSearch } from "@/domain/workspace";
import { DueDatePicker } from "@/views/project/backlog/date-picker";
import { PriorityToggler } from "@/views/project/backlog/priority-toggler";
import { GithubIntegrationApi, IssueApi, ProjectApi } from "@epicstory/api-client";
import type { IGithubIssuePullRequestLink, IMessage, IReply, IUser } from "@epicstory/contracts";
import { computed, onMounted, reactive, ref, watch } from "vue";
import IssueActivitySection from "./IssueActivitySection.vue";
import SubIssuesSection from "./SubIssuesSection.vue";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  issueId: string;
}>();

const { user } = useAuth();

const { issue, fetchIssue, updateIssue, addAssignee, removeAssignee, addLabel, removeLabel } = useIssue();

const {
  members: workspaceMemberRowsForMentions,
  search: searchWorkspaceMembersForMentions,
  loadMore: loadMoreWorkspaceMembersForMentions,
  hasMore: hasMoreWorkspaceMembersForMentions,
  isFetchingMore: isFetchingMoreWorkspaceMembersForMentions,
} = useScopedWorkspaceMemberSearch();

watch(
  () => issue.value?.workspaceId,
  (wid) => {
    if (wid != null) searchWorkspaceMembersForMentions(wid, "");
  },
  { immediate: true },
);

const workspaceMentionUsers = computed(() => workspaceMemberRowsForMentions.value.map((m) => m.user));

async function onWorkspaceMentionListReachedBottom() {
  const wid = issue.value?.workspaceId;
  if (wid == null) return;
  await loadMoreWorkspaceMembersForMentions(wid);
}

const issueApi = useDependency(IssueApi);
const {
  attachmentTileRows,
  attachmentsUploading,
  refreshAttachments,
  removeAttachment,
  resolveAttachmentsForEntity,
  ingestFromActivity,
  dismissPendingUpload,
  uploadIssueAttachmentFiles,
} = useIssueAttachments({
  issueApi,
  issueId: () => issue.value?.id ?? 0,
});

const activitySectionRef = ref<{ reloadFeed: () => Promise<void> } | null>(null);

async function onIssueAttachmentsDropped(files: File[]) {
  attachmentsError.value = null;
  await uploadIssueAttachmentFiles(files, {
    reloadFeed: async () => {
      await activitySectionRef.value?.reloadFeed?.();
    },
  });
}

const attachmentsLoading = ref(false);
const attachmentsError = ref<string | null>(null);

async function loadIssueAttachments() {
  if (!issue.value?.id) return;
  attachmentsLoading.value = true;
  attachmentsError.value = null;
  try {
    await refreshAttachments();
  } catch (e: unknown) {
    attachmentsError.value = e instanceof Error ? e.message : "Could not load files";
  } finally {
    attachmentsLoading.value = false;
  }
}

watch(
  () => issue.value?.id,
  (id) => {
    if (id) loadIssueAttachments();
  },
  { immediate: true },
);

const assigneeUsers = ref<IUser[]>([]);
watch(
  () => issue.value?.assignees,
  (a) => {
    assigneeUsers.value = a ? [...a] : [];
  },
  { immediate: true, deep: true },
);

const projectApi = useDependency(ProjectApi);
const githubIntegrationApi = useDependency(GithubIntegrationApi);
const project = ref<Project | null>(null);

const githubPullRequests = ref<IGithubIssuePullRequestLink[]>([]);
const githubPullRequestsLoading = ref(false);
const githubPullRequestsError = ref<string | null>(null);

watch(
  () => issue.value?.id,
  async (id) => {
    if (id == null) {
      githubPullRequests.value = [];
      githubPullRequestsError.value = null;
      return;
    }
    githubPullRequestsLoading.value = true;
    githubPullRequestsError.value = null;
    try {
      githubPullRequests.value = await githubIntegrationApi.listIssueGithubPullRequests(id);
    } catch (e: unknown) {
      githubPullRequests.value = [];
      githubPullRequestsError.value = e instanceof Error ? e.message : "Could not load GitHub pull requests";
    } finally {
      githubPullRequestsLoading.value = false;
    }
  },
  { immediate: true },
);

const isSaving = ref(false);
const saveError = ref<string | null>(null);

const titleEl = ref<HTMLInputElement | null>(null);

async function removeIssueAttachmentFile(attachmentId: number) {
  attachmentsError.value = null;
  try {
    await removeAttachment(attachmentId);
  } catch (e: unknown) {
    attachmentsError.value = e instanceof Error ? e.message : "Could not remove file";
    await loadIssueAttachments();
  }
}

function resolveCommentAttachments(entity: IMessage | IReply) {
  return resolveAttachmentsForEntity(entity);
}

async function onComposerAttachmentRemoved() {
  await loadIssueAttachments();
}

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

async function savePatch(data: Parameters<typeof updateIssue>[0]) {
  if (!issue.value) return;
  isSaving.value = true;
  saveError.value = null;
  try {
    await updateIssue(data);
  } catch (e: any) {
    saveError.value = e?.message ?? "Failed to save changes";
  } finally {
    isSaving.value = false;
  }
}

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
  const data: any = {};
  if (form.title !== issue.value.title) data.title = form.title;
  if (Object.keys(data).length === 0) return;
  savePatch(data);
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

async function onSaveDescription(description: any) {
  if (!issue.value) return;
  await savePatch({ description });
  await loadIssueAttachments();
}

onMounted(() => {
  refreshIssue();
});

watch(
  () => props.projectId,
  async (projectId) => {
    project.value = await projectApi.findProject(+projectId);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex:col-lg mx-auto max-w-5xl w-full px-6 py-8">
    <div class="flex:row-xl flex:center-y">
      <div class="flex:col-sm">
        <div class="text-xs text-secondary-foreground">
          <span class="font-medium">{{ project?.name ?? "Project" }}</span>
          <span class="mx-2">/</span>
          <span class="text-foreground/80">Issue #{{ issue?.id ?? props.issueId }}</span>
        </div>
      </div>

      <div class="flex-1" />

      <div class="flex:row-md flex:center-y">
        <div v-if="isSaving" class="text-xs text-secondary-foreground">Saving…</div>
        <Button variant="outline" size="sm" :disabled="!issue || isSaving" @click="saveMainFields"
          >Save</Button
        >
      </div>
    </div>

    <div v-if="saveError" class="text-sm text-red-600">{{ saveError }}</div>

    <div class="grid grid-cols-[1fr_280px] items-start gap-6">
      <!-- Main -->
      <div class="flex:col-lg">
        <div class="flex:col-sm">
          <div v-if="!isEditingTitle" class="select-none">
            <div
              class="text-2xl font-semibold text-foreground leading-tight cursor-text rounded-md px-2 -mx-2 hover:bg-zinc-50"
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
              @keydown.enter.prevent="finishEditTitle"
              @keydown.esc.prevent="cancelEditTitle"
            />
          </div>
        </div>

        <IssueDescriptionEditor
          :key="props.issueId"
          :description="issue?.description ?? { type: 'doc', content: [{ type: 'paragraph', content: [] }] }"
          :issue-id="+props.issueId"
          :disabled="!issue"
          :is-saving="isSaving"
          :mentionables="workspaceMentionUsers"
          :me-id="user?.id"
          :on-mention-list-reached-bottom="onWorkspaceMentionListReachedBottom"
          :mention-list-has-more="hasMoreWorkspaceMembersForMentions"
          :mention-list-loading-more="isFetchingMoreWorkspaceMembersForMentions"
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

        <IssueAttachmentsStrip
          v-if="issue && user"
          :rows="attachmentTileRows"
          :loading="attachmentsLoading"
          :error="attachmentsError"
          :me-id="user.id"
          droppable
          :upload-in-progress="attachmentsUploading"
          class="mt-8"
          :remove-file="removeIssueAttachmentFile"
          :dismiss-pending-upload="dismissPendingUpload"
          @files-dropped="onIssueAttachmentsDropped"
        />

        <IssueActivitySection
          v-if="issue && user"
          ref="activitySectionRef"
          :issue-id="issue.id"
          :comment-channel-id="issue.commentChannelId"
          :workspace-mention-users="workspaceMentionUsers"
          :me-id="user.id"
          :on-mention-list-reached-bottom="onWorkspaceMentionListReachedBottom"
          :mention-list-has-more="hasMoreWorkspaceMembersForMentions"
          :mention-list-loading-more="isFetchingMoreWorkspaceMembersForMentions"
          :resolve-comment-attachments="resolveCommentAttachments"
          :sync-issue-attachments="ingestFromActivity"
          @issue-attachment-removed="onComposerAttachmentRemoved"
        />
      </div>

      <!-- Sidebar -->
      <div class="flex:col-xl">
        <div class="flex:col-xl p-4 border rounded-xl bg-white shadow-sm">
          <div class="text-sm font-medium text-foreground">Details</div>

          <div class="flex:col-sm">
            <div class="text-xs text-secondary-foreground">Status</div>

            <IssueStatusDropdown :value="issue?.status ?? 'todo'" @select="savePatch({ status: $event })">
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
                    {{ project?.name ?? `#${props.projectId}` }}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {{ project?.name ?? `#${props.projectId}` }}
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
                  <UserAvatar
                    v-for="user in users"
                    :key="user.id"
                    :name="user.name"
                    :picture="user.picture"
                    size="mdLg"
                    :title="user.name"
                    class="border-2 border-white"
                  />

                  <!-- <UserAvatarStack
                    v-if="users.length"
                    :users="users"
                    size="mdLg"
                    :min="1"
                    :overlap-px="12"
                    avatar-class="border-2 border-white"
                  /> -->

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
                  @update:value="savePatch({ priority: $event })"
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
                  :disabled="isSaving"
                  @click="savePatch({ dueDate: null })"
                >
                  Clear
                </Button>
              </div>
              <div class="min-w-0">
                <DueDatePicker
                  :model-value="issue?.dueDate ?? undefined"
                  size="badge"
                  :disabled="!issue"
                  @update:model-value="savePatch({ dueDate: $event })"
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

          <!-- GitHub PRs synced via webhooks -->
          <div v-if="issue" class="flex:col-sm border-t border-border pt-4">
            <div class="text-xs text-secondary-foreground">GitHub pull requests</div>
            <div v-if="githubPullRequestsLoading" class="text-xs text-muted-foreground">Loading…</div>
            <div v-else-if="githubPullRequestsError" class="text-xs text-red-600">
              {{ githubPullRequestsError }}
            </div>
            <div v-else-if="githubPullRequests.length === 0" class="text-xs text-muted-foreground">
              None synced yet (open a PR from a branch named
              <span class="font-mono">{{ issue.id }}-…</span> on a linked repo).
            </div>
            <ul v-else class="flex:col-sm list-none min-w-0">
              <li v-for="pr in githubPullRequests" :key="pr.githubPullRequestId" class="min-w-0">
                <a
                  :href="pr.htmlUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-primary hover:underline min-w-0"
                >
                  <span class="font-medium truncate">{{ pr.fullName }}#{{ pr.prNumber }}</span>
                  <span class="text-xs text-muted-foreground shrink-0">
                    {{
                      pr.merged ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open"
                    }}
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <IssueAttachmentsStrip
            v-if="issue && user"
            :rows="attachmentTileRows"
            :loading="attachmentsLoading"
            :error="attachmentsError"
            :me-id="user.id"
            compact
            droppable
            :upload-in-progress="attachmentsUploading"
            class="mt-2 border-t border-border pt-4"
            :remove-file="removeIssueAttachmentFile"
            :dismiss-pending-upload="dismissPendingUpload"
            @files-dropped="onIssueAttachmentsDropped"
          />
        </div>
      </div>
    </div>
  </div>
</template>
