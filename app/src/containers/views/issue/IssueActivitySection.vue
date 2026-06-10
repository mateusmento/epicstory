<script lang="ts" setup>
import { staticMentionView } from "@/containers/issue/map-issue-mention-view";
import { useIssueAttachmentsContext } from "@/containers/issue/issue-attachments.context";
import IssueCommentCard from "@/containers/issue/IssueCommentCard.vue";
import { issueActivityMessageComposerAttachmentHandlers } from "@/containers/messages";
import IssueCommentComposer from "@/containers/views/issue/IssueCommentComposer.vue";
import { useDependency } from "@/core/dependency-injection";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import {
  formatIssueActivitySentence,
  formatIssueActivityWhen,
  resolveIssueActivityActor,
  useIssue,
  useIssueActivityFeed,
  useIssueCommentEditing,
  useIssueCommentSocketSync,
  useIssueCommentThreads,
} from "@/domain/issues";
import { useWorkspace } from "@/domain/workspace";
import { UserAvatar } from "@/presentationals/user";
import { ChannelApi, IssueApi } from "@epicstory/api-client";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import type { IIssueFeedItem, IMessage, IReply } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { computed, nextTick, ref } from "vue";

const props = withDefaults(
  defineProps<{
    issueId: number;
    commentChannelId: number;
    meId: number;
    mention?: MentionComposerView;
  }>(),
  {},
);

const emit = defineEmits<{
  "mention-load-more": [];
}>();

const {
  loadAttachments,
  resolveAttachmentsForEntity: resolveCommentAttachments,
  ingestFromActivity: syncIssueAttachments,
} = useIssueAttachmentsContext();

const issueApi = useDependency(IssueApi);
const channels = useDependency(ChannelApi);
const { workspace } = useWorkspace();
const { deleteIssueComment, updateIssueComment } = useIssue();

const composerAttachmentHandlers = computed(() =>
  issueActivityMessageComposerAttachmentHandlers({
    issueApi,
    issueId: () => props.issueId,
    channelApi: channels,
    commentChannelId: () => props.commentChannelId,
  }),
);

const tab = ref<"all" | "comments">("all");

const {
  feed,
  commentMessages,
  channelPeers,
  loading,
  loadError,
  peersById,
  filteredFeedItems,
  reloadAfterComment,
} = useIssueActivityFeed({
  issueId: () => props.issueId,
  commentChannelId: () => props.commentChannelId,
  tab,
  issueApi,
  channelApi: channels,
  onSyncAttachments: syncIssueAttachments,
});

const composerMention = computed((): MentionComposerView | undefined => {
  if (props.mention?.mentionables.length) return props.mention;
  if (channelPeers.value.length > 0) {
    return staticMentionView(channelPeers.value, props.mention?.onlineUserIds);
  }
  return props.mention;
});

const {
  threadByRootId,
  ensureThreadState,
  isLoadingThread,
  isExpandedThread,
  hiddenReplyCount,
  displayedRepliesForItem,
  toggleThreadReplies,
  replyKey,
} = useIssueCommentThreads({
  feed,
  tab,
  issueId: () => props.issueId,
  channelApi: channels,
  onSyncReplies: (replies) => syncIssueAttachments({ replies }),
});

useIssueCommentSocketSync({
  commentChannelId: () => props.commentChannelId,
  workspaceId: () => workspace.value.id,
  feed,
  commentMessages,
  threadByRootId,
});

const { editing, startEdit, cancelEdit, submitEdit, clearIfEditingEntity } = useIssueCommentEditing({
  updateIssueComment,
  onAfterSave: reloadAfterComment,
});

function onComposerIssueAttachmentRemoved() {
  loadAttachments();
}

async function onPostIssueComment(payload: { content: JSONContent; attachmentIds?: number[] }) {
  await issueApi.postIssueComment(props.issueId, {
    content: payload.content,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  await reloadAfterComment();
}

async function onReplyInThread(
  parentMessageId: number,
  payload: { content: JSONContent; attachmentIds?: number[] },
) {
  await issueApi.replyToIssueComment(props.issueId, parentMessageId, {
    content: payload.content,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  await reloadAfterComment();
}

async function onDelete(entity: IMessage | IReply) {
  await deleteIssueComment(entity);
  clearIfEditingEntity(entity.id);
  await reloadAfterComment();
}

function itemByRootId(rootId: number): IIssueFeedItem | null {
  const items = filteredFeedItems.value;
  for (const it of items) {
    if (it.type === "comment_created" && it.message?.id === rootId) return it;
  }
  return null;
}

async function onToggleDiscussion(entity: IMessage | IReply) {
  const rootId = "messageId" in entity && entity.messageId != null ? entity.messageId : (entity.id as number);

  if (tab.value !== "all") {
    tab.value = "all";
    await nextTick();
    await nextTick();
  }

  const it = itemByRootId(rootId);
  if (it) {
    await toggleThreadReplies(it);
    const s = ensureThreadState(rootId);
    s.expanded = true;
  }
}

defineExpose({
  reloadFeed: reloadAfterComment,
});
</script>

<template>
  <section class="mt-10 flex flex-col gap-6 border-t border-border pt-8">
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-[13px] font-semibold tracking-tight text-foreground">Activity</h2>
      <div class="flex rounded-md bg-muted p-0.5">
        <button
          type="button"
          class="rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors"
          :class="
            tab === 'all'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'all'"
        >
          All
        </button>
        <button
          type="button"
          class="rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors"
          :class="
            tab === 'comments'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'comments'"
        >
          Comments
        </button>
      </div>
    </div>

    <div v-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <div v-else-if="loading" class="text-[13px] text-muted-foreground">Loading…</div>

    <ul v-else-if="tab === 'all'" class="flex list-none flex-col">
      <li v-for="(item, i) in filteredFeedItems" :key="item.activityId" class="flex min-w-0 items-stretch">
        <div v-if="item.type === 'comment_created' && item.message?.id" class="flex:col">
          <div
            v-if="filteredFeedItems[i - 1]?.type === 'comment_created'"
            :class="cn('ml-6 h-6 w-px shrink-0 bg-border')"
          />

          <div
            class="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          >
            <IssueCommentCard
              :message="item.message"
              :me-id="meId"
              :attachments="resolveCommentAttachments(item.message)"
              variant="threadSegment"
              @message-deleted="onDelete(item.message)"
              @toggle-discussion="onToggleDiscussion(item.message)"
              @edit="startEdit(item.message)"
            />
            <div
              v-if="commentChannelId != null && editing?.id === item.message.id"
              class="border-t border-border/60 bg-muted/60 p-2"
            >
              <IssueCommentComposer
                :key="`edit-${item.message.id}`"
                :channel-id="commentChannelId"
                :attachment-handlers="composerAttachmentHandlers"
                :mention="composerMention"
                :me-id="meId"
                @mention-load-more="emit('mention-load-more')"
                :editing-message="editing"
                class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-border bg-card shadow-none"
                @submit-edit="submitEdit"
                @cancel-edit="cancelEdit"
                @existing-attachment-removed="onComposerIssueAttachmentRemoved"
              />
            </div>
            <button
              v-if="item.hasMoreOlder && hiddenReplyCount(item) > 0"
              type="button"
              class="flex w-full items-center justify-between gap-2 border-t border-border/70 px-4 py-2 text-left text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
              :aria-expanded="isExpandedThread(item)"
              :disabled="isLoadingThread(item)"
              @click="toggleThreadReplies(item)"
            >
              <span class="flex min-w-0 items-center gap-2">
                <template v-if="isExpandedThread(item)">Collapse</template>
                <template v-else>
                  {{ hiddenReplyCount(item) }}
                  earlier
                  {{ hiddenReplyCount(item) === 1 ? "reply" : "replies" }}
                </template>
                <span v-if="isLoadingThread(item)" class="text-muted-foreground/70">Loading…</span>
              </span>
              <Icon
                :name="isExpandedThread(item) ? 'oi-chevron-up' : 'oi-chevron-down'"
                class="size-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden="true"
              />
            </button>
            <template v-for="(rep, repIdx) in displayedRepliesForItem(item)" :key="replyKey(rep, repIdx)">
              <IssueCommentCard
                :message="rep"
                :me-id="meId"
                :attachments="resolveCommentAttachments(rep)"
                variant="threadSegment"
                segment-divider
                @message-deleted="onDelete(rep)"
                @toggle-discussion="onToggleDiscussion(rep)"
                @edit="startEdit(rep)"
              />
              <div
                v-if="commentChannelId != null && editing?.id === rep.id"
                class="border-t border-border/60 bg-muted/60 p-2"
              >
                <IssueCommentComposer
                  :key="`edit-reply-${rep.id}`"
                  :channel-id="commentChannelId"
                  :attachment-handlers="composerAttachmentHandlers"
                  :mention="composerMention"
                  :me-id="meId"
                  @mention-load-more="emit('mention-load-more')"
                  :editing-message="editing"
                  class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-border bg-card shadow-none"
                  @submit-edit="submitEdit"
                  @cancel-edit="cancelEdit"
                  @existing-attachment-removed="onComposerIssueAttachmentRemoved"
                />
              </div>
            </template>
            <div v-if="commentChannelId != null" class="border-t border-border/60 bg-muted/60 p-2">
              <IssueCommentComposer
                :key="`reply-${item.activityId}-${item.message.id}`"
                :channel-id="commentChannelId"
                :attachment-handlers="composerAttachmentHandlers"
                :mention="composerMention"
                :me-id="meId"
                @mention-load-more="emit('mention-load-more')"
                placeholder="Leave a reply…"
                class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-border bg-card shadow-none"
                @send-message="onReplyInThread(item.message.id, $event)"
              />
            </div>
          </div>
        </div>

        <div v-else class="flex:col ml-4">
          <div
            :class="
              cn(
                'ml-1 mb-1 w-px shrink-0 bg-border',
                filteredFeedItems[i - 1]?.type === 'comment_created' ? 'h-5' : 'h-1.5',
                { 'opacity-0': i === 0 },
              )
            "
          />

          <div :class="cn('flex items-center gap-3')">
            <div class="size-2.5 shrink-0 rounded-full bg-violet-600" />
            <UserAvatar
              class="mt-0.5 shrink-0"
              :name="resolveIssueActivityActor(item, peersById).name"
              :picture="resolveIssueActivityActor(item, peersById).picture"
              size="sm"
            />
            <p class="min-w-0 flex-1 text-[13px] text-foreground">
              {{ formatIssueActivitySentence(item, peersById) }}
              <span class="text-muted-foreground/50"> · </span>
              <time class="text-muted-foreground" :datetime="item.createdAt">{{
                formatIssueActivityWhen(item.createdAt)
              }}</time>
            </p>
          </div>

          <div
            :class="
              cn(
                'ml-1 mt-1 w-px shrink-0 bg-border',
                filteredFeedItems[i + 1]?.type === 'comment_created' ? 'h-5' : 'h-1.5',
                { 'opacity-0': i === filteredFeedItems.length - 1 },
              )
            "
          />
        </div>
      </li>
      <li v-if="filteredFeedItems.length === 0" class="list-none py-2 text-[13px] text-muted-foreground">
        No activity yet.
      </li>
    </ul>

    <ul v-else class="flex list-none flex-col gap-4">
      <li v-for="msg in commentMessages" :key="msg.id">
        <IssueCommentCard
          :message="msg"
          :me-id="meId"
          :attachments="resolveCommentAttachments(msg)"
          @message-deleted="onDelete(msg)"
          @toggle-discussion="onToggleDiscussion(msg)"
          @edit="startEdit(msg)"
        />
        <div
          v-if="commentChannelId != null && editing?.id === msg.id"
          class="mt-2 rounded-lg border border-border bg-muted/40 p-2"
        >
          <IssueCommentComposer
            :key="`edit-comments-${msg.id}`"
            :channel-id="commentChannelId"
            :attachment-handlers="composerAttachmentHandlers"
            :mention="composerMention"
            :me-id="meId"
            @mention-load-more="emit('mention-load-more')"
            :editing-message="editing"
            class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-border bg-card shadow-none"
            @submit-edit="submitEdit"
            @cancel-edit="cancelEdit"
            @existing-attachment-removed="onComposerIssueAttachmentRemoved"
          />
        </div>
      </li>
      <li v-if="commentMessages.length === 0" class="text-[13px] text-muted-foreground">No comments yet.</li>
    </ul>

    <div v-if="commentChannelId != null" class="rounded-lg border border-border bg-muted/40 p-2">
      <IssueCommentComposer
        :channel-id="commentChannelId"
        :attachment-handlers="composerAttachmentHandlers"
        :mention="composerMention"
        :me-id="meId"
        @mention-load-more="emit('mention-load-more')"
        placeholder="Leave a comment…"
        class="max-h-[min(40vh,22rem)] w-full max-w-full shrink-0 rounded-lg border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        @send-message="onPostIssueComment"
      />
    </div>
    <div v-else class="text-[12px] text-muted-foreground">
      Comment channel is initializing — refresh in a moment.
    </div>
  </section>
</template>
