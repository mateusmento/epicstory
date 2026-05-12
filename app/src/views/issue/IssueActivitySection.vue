<script lang="ts" setup>
import IssueCommentCard from "@/components/issue/IssueCommentCard.vue";
import { Icon } from "@/design-system/icons";
import { UserAvatar } from "@/components/user";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi } from "@/domain/issues/api";
import {
  useIssueActivityFeed,
  useIssueCommentEditing,
  useIssueCommentThreads,
} from "@/domain/issues/composables";
import {
  formatIssueActivitySentence,
  formatIssueActivityWhen,
  resolveIssueActivityActor,
} from "@/domain/issues/issue-activity-feed-text";
import type { JSONContent } from "@tiptap/core";
import type { IssueFeedItem } from "@/domain/issues/types/issue-feed.type";
import type { IMessage, IReply } from "@/domain/channels";
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import type { User } from "@/domain/user";
import { computed, nextTick, ref } from "vue";
import { cn } from "@/design-system/utils";
import { issueActivityMessageComposerAttachmentHandlers } from "@/components/messages";
import { useIssue } from "@/domain/issues/composables/issue";
import type { IssueAttachmentActivitySyncPayload } from "@/domain/issues/composables/issue-attachments";
import IssueCommentComposer from "./IssueCommentComposer.vue";

const props = withDefaults(
  defineProps<{
    issueId: number;
    commentChannelId: number;
    meId: number;
    /** Workspace roster for @mentions (parent-loaded to avoid duplicate fetches). */
    workspaceMentionUsers?: User[];
    /** Paginated workspace mentions: scroll mention list to bottom → load more. */
    onMentionListReachedBottom?: () => void | Promise<void>;
    mentionListHasMore?: boolean;
    mentionListLoadingMore?: boolean;
    resolveCommentAttachments?: (entity: IMessage | IReply) => MessageAttachmentDto[];
    syncIssueAttachments?: (payload: IssueAttachmentActivitySyncPayload) => void;
  }>(),
  {
    mentionListHasMore: true,
    mentionListLoadingMore: false,
  },
);

const emit = defineEmits<{
  /** Fired when an attachment is removed from a comment/reply while editing (strip + feed sync). */
  issueAttachmentRemoved: [];
}>();

const issueApi = useDependency(IssueApi);
const channels = useDependency(ChannelApi);
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
  onSyncAttachments: (p) => props.syncIssueAttachments?.(p),
});

const composerMentionables = computed(() => {
  const ws = props.workspaceMentionUsers ?? [];
  if (ws.length > 0) return ws;
  return channelPeers.value;
});

const {
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
  onSyncReplies: (replies) => props.syncIssueAttachments?.({ replies }),
});

const { editing, editingMessagePayload, startEdit, cancelEdit, submitEdit, clearIfEditingEntity } =
  useIssueCommentEditing({
    updateIssueComment,
    onAfterSave: reloadAfterComment,
  });

function onComposerIssueAttachmentRemoved() {
  emit("issueAttachmentRemoved");
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

function itemByRootId(rootId: number): IssueFeedItem | null {
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
  <section class="mt-10 flex flex-col gap-6 border-t border-zinc-200/80 pt-8">
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-[13px] font-semibold tracking-tight text-zinc-900">Activity</h2>
      <div class="flex rounded-md bg-zinc-100/90 p-0.5">
        <button
          type="button"
          class="rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors"
          :class="tab === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'"
          @click="tab = 'all'"
        >
          All
        </button>
        <button
          type="button"
          class="rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors"
          :class="
            tab === 'comments' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          "
          @click="tab = 'comments'"
        >
          Comments
        </button>
      </div>
    </div>

    <div v-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <div v-else-if="loading" class="text-[13px] text-zinc-500">Loading…</div>

    <ul v-else-if="tab === 'all'" class="flex list-none flex-col">
      <li v-for="(item, i) in filteredFeedItems" :key="item.activityId" class="flex min-w-0 items-stretch">
        <div v-if="item.type === 'comment_created' && item.message?.id" class="flex:col">
          <div
            v-if="filteredFeedItems[i - 1]?.type === 'comment_created'"
            :class="cn('ml-6 h-6 w-px shrink-0 bg-zinc-200')"
          />

          <div
            class="overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          >
            <IssueCommentCard
              :message="item.message"
              :me-id="meId"
              :attachments="resolveCommentAttachments?.(item.message)"
              variant="threadSegment"
              @message-deleted="onDelete(item.message)"
              @toggle-discussion="onToggleDiscussion(item.message)"
              @edit="startEdit(item.message)"
            />
            <div
              v-if="commentChannelId != null && editing?.id === item.message.id"
              class="border-t border-zinc-100 bg-zinc-50/60 p-2"
            >
              <IssueCommentComposer
                :key="`edit-${item.message.id}`"
                :channel-id="commentChannelId"
                :attachment-handlers="composerAttachmentHandlers"
                :mentionables="composerMentionables"
                :me-id="meId"
                :on-mention-list-reached-bottom="onMentionListReachedBottom"
                :mention-list-has-more="mentionListHasMore"
                :mention-list-loading-more="mentionListLoadingMore"
                :editing-message="editingMessagePayload"
                class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-none"
                @submit-edit="submitEdit"
                @cancel-edit="cancelEdit"
                @existing-attachment-removed="onComposerIssueAttachmentRemoved"
              />
            </div>
            <button
              v-if="item.hasMoreOlder && hiddenReplyCount(item) > 0"
              type="button"
              class="flex w-full items-center justify-between gap-2 border-t border-zinc-200/70 px-4 py-2 text-left text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50/90 disabled:opacity-60"
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
                <span v-if="isLoadingThread(item)" class="text-zinc-400">Loading…</span>
              </span>
              <Icon
                :name="isExpandedThread(item) ? 'oi-chevron-up' : 'oi-chevron-down'"
                class="size-3.5 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
            </button>
            <template v-for="(rep, repIdx) in displayedRepliesForItem(item)" :key="replyKey(rep, repIdx)">
              <IssueCommentCard
                :message="rep"
                :me-id="meId"
                :attachments="resolveCommentAttachments?.(rep)"
                variant="threadSegment"
                segment-divider
                @message-deleted="onDelete(rep)"
                @toggle-discussion="onToggleDiscussion(rep)"
                @edit="startEdit(rep)"
              />
              <div
                v-if="commentChannelId != null && editing?.id === rep.id"
                class="border-t border-zinc-100 bg-zinc-50/60 p-2"
              >
                <IssueCommentComposer
                  :key="`edit-reply-${rep.id}`"
                  :channel-id="commentChannelId"
                  :attachment-handlers="composerAttachmentHandlers"
                  :mentionables="composerMentionables"
                  :me-id="meId"
                  :on-mention-list-reached-bottom="onMentionListReachedBottom"
                  :mention-list-has-more="mentionListHasMore"
                  :mention-list-loading-more="mentionListLoadingMore"
                  :editing-message="editingMessagePayload"
                  class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-none"
                  @submit-edit="submitEdit"
                  @cancel-edit="cancelEdit"
                  @existing-attachment-removed="onComposerIssueAttachmentRemoved"
                />
              </div>
            </template>
            <div v-if="commentChannelId != null" class="border-t border-zinc-100 bg-zinc-50/60 p-2">
              <IssueCommentComposer
                :key="`reply-${item.activityId}-${item.message.id}`"
                :channel-id="commentChannelId"
                :attachment-handlers="composerAttachmentHandlers"
                :mentionables="composerMentionables"
                :me-id="meId"
                :on-mention-list-reached-bottom="onMentionListReachedBottom"
                :mention-list-has-more="mentionListHasMore"
                :mention-list-loading-more="mentionListLoadingMore"
                placeholder="Leave a reply…"
                class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-none"
                @send-message="onReplyInThread(item.message.id, $event)"
              />
            </div>
          </div>
        </div>

        <div v-else class="flex:col ml-4">
          <div
            :class="
              cn(
                'ml-1 mb-1 w-px shrink-0 bg-zinc-200',
                filteredFeedItems[i - 1]?.type === 'comment_created' ? 'h-5' : 'h-1.5',
                { 'opacity-0': i === 0 },
              )
            "
          />

          <div :class="cn('flex items-center gap-3')">
            <div class="size-2.5 shrink-0 rounded-full bg-violet-600 shadow-[0_0_0_3px_rgb(255_255_255)]" />
            <UserAvatar
              class="mt-0.5 shrink-0 ring-2 ring-white"
              :name="resolveIssueActivityActor(item, peersById).name"
              :picture="resolveIssueActivityActor(item, peersById).picture"
              size="sm"
            />
            <p class="min-w-0 flex-1 text-[13px] leading-snug text-zinc-800">
              {{ formatIssueActivitySentence(item, peersById) }}
              <span class="text-zinc-300"> · </span>
              <time class="text-zinc-500" :datetime="item.createdAt">{{
                formatIssueActivityWhen(item.createdAt)
              }}</time>
            </p>
          </div>

          <div
            :class="
              cn(
                'ml-1 mt-1 w-px shrink-0 bg-zinc-200',
                filteredFeedItems[i + 1]?.type === 'comment_created' ? 'h-5' : 'h-1.5',
                { 'opacity-0': i === filteredFeedItems.length - 1 },
              )
            "
          />
        </div>
      </li>
      <li v-if="filteredFeedItems.length === 0" class="list-none py-2 text-[13px] text-zinc-500">
        No activity yet.
      </li>
    </ul>

    <ul v-else class="flex list-none flex-col gap-4">
      <li v-for="msg in commentMessages" :key="msg.id">
        <IssueCommentCard
          :message="msg"
          :me-id="meId"
          :attachments="resolveCommentAttachments?.(msg)"
          @message-deleted="onDelete(msg)"
          @toggle-discussion="onToggleDiscussion(msg)"
          @edit="startEdit(msg)"
        />
        <div
          v-if="commentChannelId != null && editing?.id === msg.id"
          class="mt-2 rounded-lg border border-zinc-200/90 bg-zinc-50/40 p-2"
        >
          <IssueCommentComposer
            :key="`edit-comments-${msg.id}`"
            :channel-id="commentChannelId"
            :attachment-handlers="composerAttachmentHandlers"
            :mentionables="composerMentionables"
            :me-id="meId"
            :on-mention-list-reached-bottom="onMentionListReachedBottom"
            :mention-list-has-more="mentionListHasMore"
            :mention-list-loading-more="mentionListLoadingMore"
            :editing-message="editingMessagePayload"
            class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-none"
            @submit-edit="submitEdit"
            @cancel-edit="cancelEdit"
            @existing-attachment-removed="onComposerIssueAttachmentRemoved"
          />
        </div>
      </li>
      <li v-if="commentMessages.length === 0" class="text-[13px] text-zinc-500">No comments yet.</li>
    </ul>

    <div v-if="commentChannelId != null" class="rounded-lg border border-zinc-200/90 bg-zinc-50/40 p-2">
      <IssueCommentComposer
        :channel-id="commentChannelId"
        :attachment-handlers="composerAttachmentHandlers"
        :mentionables="composerMentionables"
        :me-id="meId"
        :on-mention-list-reached-bottom="onMentionListReachedBottom"
        :mention-list-has-more="mentionListHasMore"
        :mention-list-loading-more="mentionListLoadingMore"
        placeholder="Leave a comment…"
        class="max-h-[min(40vh,22rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        @send-message="onPostIssueComment"
      />
    </div>
    <div v-else class="text-[12px] text-zinc-500">Comment channel is initializing — refresh in a moment.</div>
  </section>
</template>
