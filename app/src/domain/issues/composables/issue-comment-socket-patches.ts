import type { IMessage, IIssueFeed, IIssueFeedItem, IReply } from "@epicstory/contracts";
import type { Ref } from "vue";
import type { IssueCommentThreadState } from "./issue-comment-threads";

function replySentAtIso(reply: IReply): string {
  return typeof reply.sentAt === "string" ? reply.sentAt : (reply.sentAt as Date).toISOString();
}

function sortRepliesInPlace(replies: IReply[]): void {
  replies.sort((a, b) => {
    const byTime = new Date(replySentAtIso(a)).getTime() - new Date(replySentAtIso(b)).getTime();
    if (byTime !== 0) return byTime;
    return a.id - b.id;
  });
}

function findCommentCreatedItem(
  feed: IIssueFeed,
  messageId: number,
): (IIssueFeedItem & { type: "comment_created" }) | null {
  const item = feed.items.find((row) => row.type === "comment_created" && row.message?.id === messageId);
  return item?.type === "comment_created" ? item : null;
}

export function patchReplyInFeed(feed: Ref<IIssueFeed | null>, messageId: number, reply: IReply): void {
  const item = feed.value ? findCommentCreatedItem(feed.value, messageId) : null;
  if (!item) return;

  const preview = (item.replyPreviews ?? []).find((row) => row.id === reply.id);
  if (preview) Object.assign(preview, reply);
}

export function patchReplyInThreadCache(
  threadByRootId: Map<number, IssueCommentThreadState>,
  messageId: number,
  reply: IReply,
): void {
  const cached = threadByRootId.get(messageId)?.fullReplies?.find((row) => row.id === reply.id);
  if (cached) Object.assign(cached, reply);
}

export function applyIncomingReply(
  feed: Ref<IIssueFeed | null>,
  threadByRootId: Map<number, IssueCommentThreadState>,
  messageId: number,
  reply: IReply,
): void {
  const item = feed.value ? findCommentCreatedItem(feed.value, messageId) : null;
  if (!item) return;

  const previews = item.replyPreviews ?? [];
  const existing = previews.find((row) => row.id === reply.id);
  if (existing) {
    Object.assign(existing, reply);
    patchReplyInThreadCache(threadByRootId, messageId, reply);
    return;
  }

  previews.push(reply);
  sortRepliesInPlace(previews);
  item.replyPreviews = previews;
  item.repliesTotal = (item.repliesTotal ?? previews.length - 1) + 1;

  const state = threadByRootId.get(messageId);
  if (state?.fullReplies && !state.fullReplies.some((row) => row.id === reply.id)) {
    state.fullReplies.push(reply);
    sortRepliesInPlace(state.fullReplies);
  }
}

export function applyReplyDeleted(
  feed: Ref<IIssueFeed | null>,
  threadByRootId: Map<number, IssueCommentThreadState>,
  messageId: number,
  replyId: number,
): void {
  const item = feed.value ? findCommentCreatedItem(feed.value, messageId) : null;
  if (item?.replyPreviews) {
    const index = item.replyPreviews.findIndex((row) => row.id === replyId);
    if (index >= 0) {
      item.replyPreviews.splice(index, 1);
      item.repliesTotal = Math.max(0, (item.repliesTotal ?? 1) - 1);
    }
  }

  const fullReplies = threadByRootId.get(messageId)?.fullReplies;
  if (fullReplies) {
    const index = fullReplies.findIndex((row) => row.id === replyId);
    if (index >= 0) fullReplies.splice(index, 1);
  }
}

export function patchMessageInFeed(feed: Ref<IIssueFeed | null>, message: IMessage): void {
  const item = feed.value ? findCommentCreatedItem(feed.value, message.id) : null;
  if (!item?.message) return;
  Object.assign(item.message, message);
}

export function patchMessageInCommentsTab(commentMessages: Ref<IMessage[]>, message: IMessage): void {
  const cached = commentMessages.value.find((row) => row.id === message.id);
  if (cached) Object.assign(cached, message);
}

export function removeMessageFromFeed(feed: Ref<IIssueFeed | null>, messageId: number): void {
  const current = feed.value;
  if (!current) return;

  const index = current.items.findIndex(
    (item) => item.type === "comment_created" && item.message?.id === messageId,
  );
  if (index >= 0) current.items.splice(index, 1);
}

export function removeMessageFromCommentsTab(commentMessages: Ref<IMessage[]>, messageId: number): void {
  const index = commentMessages.value.findIndex((row) => row.id === messageId);
  if (index >= 0) commentMessages.value.splice(index, 1);
}
