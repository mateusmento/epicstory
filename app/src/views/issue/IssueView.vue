<script lang="ts" setup>
import {
  IssueAttachmentsStrip,
  IssueDescriptionWithThreads,
  IssueGithubSidebarSection,
  IssuePropertiesStrip,
} from "@/containers/issue";
import { mapIssueMentionView, onlineUserIdsFrom } from "@/containers/issue/map-issue-mention-view";
import { provideIssueAttachmentsContext } from "@/containers/issue/issue-attachments.context";
import IssueActivitySection from "@/containers/views/issue/IssueActivitySection.vue";
import SubIssuesSection from "@/containers/views/issue/SubIssuesSection.vue";
import ShareToChannelSubmenu from "@/containers/channel/ShareToChannelSubmenu.vue";
import { Button, ContentEditable, Menu, MenuContent, MenuTrigger } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useWorkspaceOnline } from "@/domain/channels";
import { useIssue, useIssueAttachments } from "@/domain/issues";
import { useScopedWorkspaceMemberSearch } from "@/domain/workspace";
import { IssueKey } from "@/presentationals/issue";
import type { IUser, UpdateIssueData } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { Share2 } from "lucide-vue-next";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { cn } from "@/design-system/utils";

const EMPTY_DESCRIPTION: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [] }],
};

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

const isEditingTitle = ref(false);
const form = reactive({ title: "" });

watch(
  issue,
  (iss) => {
    if (!iss) return;
    if (isEditingTitle.value) return;
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

function saveTitleIfChanged() {
  if (!issue.value) return;
  const data: Pick<UpdateIssueData, "title"> = {};
  const next = form.title.trim();
  if (next !== (issue.value.title ?? "")) data.title = next;
  if (Object.keys(data).length === 0) return;
  patchIssue(data);
}

function startEditTitle() {
  if (!issue.value) return;
  isEditingTitle.value = true;
}

function onTitleSubmit() {
  saveTitleIfChanged();
}

function onTitleCancel() {
  if (!issue.value) return;
  form.title = issue.value.title ?? "";
}

function onTitleBlur() {
  if (!isEditingTitle.value) return;
  isEditingTitle.value = false;
  saveTitleIfChanged();
}

async function onSaveDescription(description: unknown) {
  if (!issue.value) return;
  await patchIssue({ description: description as UpdateIssueData["description"] });
}

const parentIssueLink = computed(() => {
  const parent = issue.value?.parentIssue;
  if (!parent?.id || !parent.issueKey) return null;
  return {
    issueKey: parent.issueKey,
    title: parent.title,
    to: {
      name: "project-issue" as const,
      params: {
        workspaceId: String(parent.workspaceId ?? props.workspaceId),
        projectId: String(parent.projectId),
        issueId: String(parent.id),
      },
    },
  };
});

const descriptionWorkspaceId = computed(
  () => issue.value?.workspaceId ?? (Number.isFinite(+props.workspaceId) ? +props.workspaceId : undefined),
);

onMounted(() => {
  refreshIssue();
});
</script>

<template>
  <div class="flex:col-lg mx-auto max-w-3xl w-full px-6 py-8">
    <div class="flex:row-xl flex:center-y">
      <div class="text-xs text-secondary-foreground min-w-0">
        <span class="font-medium">{{ issue?.project?.name ?? "Project" }}</span>
        <span class="mx-2">/</span>
        <template v-if="parentIssueLink">
          <RouterLink :to="parentIssueLink.to" :title="parentIssueLink.title || parentIssueLink.issueKey">
            <IssueKey :issue-key="parentIssueLink.issueKey" size="xs" class="hover:underline" />
          </RouterLink>
          <span class="mx-2">/</span>
        </template>
        <IssueKey
          v-if="issue?.issueKey"
          :issue-key="issue.issueKey"
          copyable
          size="xs"
          class="text-foreground/80"
        />
        <span v-else class="text-foreground/80">Issue #{{ props.issueId }}</span>
      </div>

      <div class="flex-1" />

      <div class="flex:row-md flex:center-y">
        <div v-if="patchMutation.busy" class="text-xs text-secondary-foreground">Saving…</div>
        <Menu v-if="issue" type="dropdown-menu">
          <MenuTrigger as-child>
            <Button variant="outline" size="sm" :disabled="patchMutation.busy">
              <Share2 class="size-3.5" />
              Share
            </Button>
          </MenuTrigger>
          <MenuContent class="p-0">
            <ShareToChannelSubmenu mode="issue" :issue="issue" />
          </MenuContent>
        </Menu>
      </div>
    </div>

    <div v-if="patchMutation.error" class="text-sm text-red-600">{{ patchMutation.error }}</div>

    <div class="flex:col-lg">
      <div class="min-w-0">
        <ContentEditable
          v-model="form.title"
          v-model:editable="isEditingTitle"
          as="div"
          placeholder="Untitled issue"
          :class="
            cn(
              'block w-full min-w-0 max-w-full whitespace-normal break-words text-2xl font-semibold',
              'text-foreground leading-tight cursor-text rounded-md px-2 py-1 -mx-2 hover:bg-muted',
              'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none',
            )
          "
          title="Click to edit"
          @click="startEditTitle"
          @submit="onTitleSubmit"
          @cancel="onTitleCancel"
          @blur="onTitleBlur"
        />
      </div>

      <IssuePropertiesStrip
        v-if="issue"
        v-model:assignees="assigneeUsers"
        :status="issue.status ?? 'todo'"
        :priority="issue.priority ?? 0"
        :due-date="issue.dueDate"
        :labels="issue.labels ?? []"
        :disabled="!issue"
        :busy="patchMutation.busy"
        @update:status="patchIssue({ status: $event })"
        @update:priority="patchIssue({ priority: $event })"
        @update:due-date="patchIssue({ dueDate: $event ?? null })"
        @clear-due-date="patchIssue({ dueDate: null })"
        @add-assignee="addAssignee($event.id)"
        @remove-assignee="removeAssignee($event.id)"
        @add-label="addLabel"
        @remove-label="removeLabel"
      />

      <IssueDescriptionWithThreads
        :key="props.issueId"
        :description="issue?.description ?? EMPTY_DESCRIPTION"
        :issue-id="+props.issueId"
        :workspace-id="descriptionWorkspaceId"
        :disabled="!issue"
        :is-saving="patchMutation.busy"
        :mention="issueMentionView"
        :me-id="user?.id"
        :me-name="user?.name"
        :me-picture="user?.picture"
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

      <IssueGithubSidebarSection
        v-if="issue"
        :issue="issue"
        :reload-issue-activity-feed="reloadIssueActivityFeed"
        :reload-issue="refreshIssue"
      />

      <IssueAttachmentsStrip v-if="issue && user" :me-id="user.id" droppable />

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
  </div>
</template>
