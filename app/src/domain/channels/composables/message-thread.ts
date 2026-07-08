import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { ChannelApi } from "@epicstory/api-client";
import type {
  IAggregatedReaction,
  IMessage,
  IReply,
  IncomingMessageReactionEvent,
  IncomingReplyEvent,
  IncomingReplyReactionEvent,
  MessageDeletedEvent,
  ReplyDeletedEvent,
  ReplyMessageBody,
  ReplyUpdatedEvent,
} from "@epicstory/contracts";
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref } from "vue";

type UseMessageThreadOptions = {
  onMessageDeleted?: () => void;
  ignoreIncomingReplies?: boolean;
};

const THREAD_REPLIES_PAGE_SIZE = 50;

function replySentAtIso(r: IReply): string {
  return typeof r.sentAt === "string" ? r.sentAt : (r.sentAt as Date).toISOString();
}

function sortRepliesAsc(list: IReply[]): IReply[] {
  return [...list].sort((a, b) => {
    const t = new Date(replySentAtIso(a)).getTime() - new Date(replySentAtIso(b)).getTime();
    if (t !== 0) return t;
    return a.id - b.id;
  });
}

export function useMessageThread(message: Ref<IMessage>, options: UseMessageThreadOptions = {}) {
  const replies = ref<IReply[]>([]);
  const isLoadingReplies = ref(false);
  const hasMoreOlderReplies = ref(false);
  const loadingOlderReplies = ref(false);

  const { user: me } = useAuth();

  const channelApi = useDependency(ChannelApi);
  const { websocket } = useWebSockets();

  onMounted(() => {
    websocket?.off("incoming-reply", onIncomingReply);
    websocket?.on("incoming-reply", onIncomingReply);
    websocket?.off("reply-updated", onReplyUpdated);
    websocket?.on("reply-updated", onReplyUpdated);
    websocket?.off("reply-deleted", onReplyDeleted);
    websocket?.on("reply-deleted", onReplyDeleted);

    websocket?.off("message-deleted", onMessageDeleted);
    websocket?.on("message-deleted", onMessageDeleted);
  });

  onUnmounted(() => {
    websocket?.off("incoming-reply", onIncomingReply);
    websocket?.off("reply-updated", onReplyUpdated);
    websocket?.off("reply-deleted", onReplyDeleted);
    websocket?.off("message-deleted", onMessageDeleted);
  });

  onMounted(() => {
    websocket?.off("incoming-message-reaction", onIncomingMessageReaction);
    websocket?.on("incoming-message-reaction", onIncomingMessageReaction);

    websocket?.off("incoming-reply-reaction", onIncomingReplyReaction);
    websocket?.on("incoming-reply-reaction", onIncomingReplyReaction);
  });

  onUnmounted(() => {
    websocket?.off("incoming-message-reaction", onIncomingMessageReaction);
    websocket?.off("incoming-reply-reaction", onIncomingReplyReaction);
  });

  async function onIncomingReply({ reply, messageId }: IncomingReplyEvent) {
    if (options.ignoreIncomingReplies) return;
    if (messageId === message.value?.id) {
      addReply(reply);
    }
  }

  function onReplyUpdated({ reply, messageId }: ReplyUpdatedEvent) {
    if (messageId !== message.value?.id) return;
    const i = replies.value.findIndex((r) => r.id === reply.id);
    if (i >= 0) {
      const next = [...replies.value];
      next[i] = { ...next[i], ...reply };
      replies.value = next;
    }
  }

  function onIncomingMessageReaction({
    messageId,
    reactions,
  }: Pick<IncomingMessageReactionEvent, "messageId" | "reactions">) {
    if (messageId === message.value?.id && reactions) {
      message.value.reactions = reactions;
    }
  }

  function onIncomingReplyReaction({
    replyId,
    reactions,
  }: Pick<IncomingReplyReactionEvent, "replyId" | "reactions">) {
    if (replyId && reactions) {
      updateReplyReactions(replyId, reactions);
    }
  }

  function onReplyDeleted({ replyId, messageId }: Pick<ReplyDeletedEvent, "replyId" | "messageId">) {
    if (replyId && messageId === message.value?.id) {
      removeReply(replyId);
    }
  }

  function onMessageDeleted({ messageId }: Pick<MessageDeletedEvent, "messageId">) {
    if (messageId === message.value?.id) {
      options.onMessageDeleted?.();
    }
  }

  async function resetAndLoadLatestReplies() {
    if (!message.value?.id) return;
    replies.value = [];
    hasMoreOlderReplies.value = false;
    const page = await channelApi.findReplies(message.value.id, {
      limit: THREAD_REPLIES_PAGE_SIZE,
    });
    replies.value = page.content;
    hasMoreOlderReplies.value = page.hasNext;
  }

  async function loadOlderRepliesPage() {
    if (!message.value?.id || !hasMoreOlderReplies.value || loadingOlderReplies.value) return;
    const oldest = replies.value[0];
    if (!oldest) return;
    loadingOlderReplies.value = true;
    try {
      const page = await channelApi.findReplies(message.value.id, {
        limit: THREAD_REPLIES_PAGE_SIZE,
        beforeSentAt: replySentAtIso(oldest),
        beforeId: oldest.id,
      });
      const existing = new Set(replies.value.map((r) => r.id));
      replies.value = [...page.content.filter((r) => !existing.has(r.id)), ...replies.value];
      hasMoreOlderReplies.value = page.hasNext;
    } finally {
      loadingOlderReplies.value = false;
    }
  }

  async function fetchReplies() {
    if (!message.value.id || isLoadingReplies.value) return;
    isLoadingReplies.value = true;
    try {
      await resetAndLoadLatestReplies();
    } catch (error) {
      console.error("Failed to fetch replies:", error);
    } finally {
      isLoadingReplies.value = false;
    }
  }

  async function sendReply(payload: ReplyMessageBody) {
    if (!me.value || !message.value.id) return;

    try {
      const reply = await channelApi.replyMessage(message.value?.id, payload);
      addReply(reply);
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  }

  async function toggleReaction(emoji: string) {
    try {
      const { reactions } = await channelApi.toggleMessageReaction(message.value?.id, { emoji });
      message.value.reactions = reactions;
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  }

  async function toggleReplyReaction(replyId: number, emoji: string) {
    try {
      const { reactions } = await channelApi.toggleReplyReaction(replyId, { emoji });
      updateReplyReactions(replyId, reactions);
    } catch (error) {
      console.error("Failed to toggle reply reaction:", error);
    }
  }

  async function deleteReply(replyId: number) {
    try {
      await channelApi.deleteReply(replyId);
      removeReply(replyId);
    } catch (error) {
      console.error("Failed to delete reply:", error);
    }
  }

  function addReply(reply: IReply) {
    const next = replies.value.filter((r) => r.id !== reply.id);
    next.push(reply);
    replies.value = sortRepliesAsc(next);
    message.value.repliesCount++;
    if (!message.value.repliers.some((replier) => replier.user.id === reply.senderId))
      message.value.repliers.push({ user: reply.sender, repliesCount: 1 });
  }

  function removeReply(replyId: number) {
    replies.value = replies.value.filter((reply) => reply.id !== replyId);
    message.value.repliesCount--;
    if (replies.value.filter((reply) => reply.senderId === me.value?.id).length === 0)
      message.value.repliers = message.value.repliers.filter((replier) => replier.user.id !== me.value?.id);
  }

  function updateReplyReactions(replyId: number, reactions: IAggregatedReaction[]) {
    const reply = replies.value.find((reply) => reply.id === replyId);
    if (reply) {
      reply.reactions = reactions;
    }
  }

  return {
    replies,
    isLoadingReplies,
    hasMoreOlderReplies,
    loadingOlderReplies,
    fetchReplies,
    loadOlderRepliesPage,
    sendReply,
    deleteReply,
    toggleReaction,
    toggleReplyReaction,
  };
}
