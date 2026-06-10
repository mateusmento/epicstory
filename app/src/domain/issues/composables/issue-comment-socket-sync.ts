import { useWebSockets } from "@/core/websockets";
import { toReadonlyRef, type ReadonlyRefOrGetter } from "@/utils";
import type {
  IMessage,
  IIssueFeed,
  IncomingReplyEvent,
  MessageDeletedEvent,
  MessageUpdatedEvent,
  ReplyDeletedEvent,
  ReplyUpdatedEvent,
} from "@epicstory/contracts";
import type { Ref } from "vue";
import { onMounted, onUnmounted } from "vue";
import type { IssueCommentThreadState } from "./issue-comment-threads";
import {
  applyIncomingReply,
  applyReplyDeleted,
  patchMessageInCommentsTab,
  patchMessageInFeed,
  patchReplyInFeed,
  patchReplyInThreadCache,
  removeMessageFromCommentsTab,
  removeMessageFromFeed,
} from "./issue-comment-socket-patches";

export function useIssueCommentSocketSync(options: {
  commentChannelId: ReadonlyRefOrGetter<number | null | undefined>;
  workspaceId: ReadonlyRefOrGetter<number>;
  feed: Ref<IIssueFeed | null>;
  commentMessages: Ref<IMessage[]>;
  threadByRootId: Map<number, IssueCommentThreadState>;
}) {
  const commentChannelId = toReadonlyRef(options.commentChannelId);
  const workspaceId = toReadonlyRef(options.workspaceId);
  const { feed, commentMessages, threadByRootId } = options;
  const { websocket } = useWebSockets();

  function isCommentChannel(channelId: number): boolean {
    return commentChannelId.value != null && channelId === commentChannelId.value;
  }

  function subscribeMessages(targetWorkspaceId: number) {
    websocket?.emit("subscribe-messages", { workspaceId: targetWorkspaceId });
  }

  function onReplyUpdated({ channelId, messageId, reply }: ReplyUpdatedEvent) {
    if (!isCommentChannel(channelId)) return;
    patchReplyInFeed(feed, messageId, reply);
    patchReplyInThreadCache(threadByRootId, messageId, reply);
  }

  function onReplyDeleted({ channelId, messageId, replyId }: ReplyDeletedEvent) {
    if (!isCommentChannel(channelId)) return;
    applyReplyDeleted(feed, threadByRootId, messageId, replyId);
  }

  function onIncomingReply({ channelId, messageId, reply }: IncomingReplyEvent) {
    if (!isCommentChannel(channelId)) return;
    applyIncomingReply(feed, threadByRootId, messageId, reply);
  }

  function onMessageUpdated({ channelId, message }: MessageUpdatedEvent) {
    if (!isCommentChannel(channelId)) return;
    patchMessageInFeed(feed, message);
    patchMessageInCommentsTab(commentMessages, message);
  }

  function onMessageDeleted({ channelId, messageId }: MessageDeletedEvent) {
    if (!isCommentChannel(channelId)) return;
    removeMessageFromFeed(feed, messageId);
    removeMessageFromCommentsTab(commentMessages, messageId);
  }

  onMounted(() => {
    subscribeMessages(workspaceId.value);

    websocket?.off("reply-updated", onReplyUpdated);
    websocket?.on("reply-updated", onReplyUpdated);
    websocket?.off("reply-deleted", onReplyDeleted);
    websocket?.on("reply-deleted", onReplyDeleted);
    websocket?.off("incoming-reply", onIncomingReply);
    websocket?.on("incoming-reply", onIncomingReply);
    websocket?.off("message-updated", onMessageUpdated);
    websocket?.on("message-updated", onMessageUpdated);
    websocket?.off("message-deleted", onMessageDeleted);
    websocket?.on("message-deleted", onMessageDeleted);
  });

  onUnmounted(() => {
    websocket?.off("reply-updated", onReplyUpdated);
    websocket?.off("reply-deleted", onReplyDeleted);
    websocket?.off("incoming-reply", onIncomingReply);
    websocket?.off("message-updated", onMessageUpdated);
    websocket?.off("message-deleted", onMessageDeleted);
  });
}
