import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import { onMounted, onUnmounted, ref, type Ref } from "vue";
import type { IAggregatedReaction, IMessage, IReply } from "../types";

type UseMessageThreadOptions = {
  onMessageDeleted?: () => void;
  name?: string;
  ignoreIncomingReplies?: boolean;
};

export function useMessageThread(message: Ref<IMessage>, options: UseMessageThreadOptions = {}) {
  const replies = ref<IReply[]>([]);
  const isLoadingReplies = ref(false);

  const { user: me } = useAuth();

  const channelApi = useDependency(ChannelApi);
  const { websocket } = useWebSockets();

  // Subscribe to incoming replies
  onMounted(() => {
    websocket?.off("incoming-reply", onIncomingReply);
    websocket?.on("incoming-reply", onIncomingReply);
    websocket?.off("reply-deleted", onReplyDeleted);
    websocket?.on("reply-deleted", onReplyDeleted);

    websocket?.off("message-deleted", onMessageDeleted);
    websocket?.on("message-deleted", onMessageDeleted);
  });

  onUnmounted(() => {
    websocket?.off("incoming-reply", onIncomingReply);
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

  async function onIncomingReply({ reply, messageId }: { reply: IReply; messageId: number }) {
    if (messageId === message.value?.id) {
      console.log("adding reply after receiving it", options.name, reply);
      addReply(reply);

      // Fetch reactions for the new reply to prevent race conditions
      // where incoming-reply-reaction event were received before the reply was added to the list
      // await fetchReplyReactions(reply.id);
    }
  }

  function onIncomingMessageReaction({
    messageId,
    reactions,
  }: {
    messageId?: number;
    reactions?: IAggregatedReaction[];
  }) {
    if (messageId === message.value?.id && reactions) {
      message.value.reactions = reactions;
    }
  }

  function onIncomingReplyReaction({
    replyId,
    reactions,
  }: {
    replyId?: number;
    reactions?: IAggregatedReaction[];
  }) {
    if (replyId && reactions) {
      updateReplyReactions(replyId, reactions);
    }
  }

  function onReplyDeleted({ replyId, messageId }: { replyId?: number; messageId?: number }) {
    if (replyId && messageId === message.value?.id) {
      removeReply(replyId);
    }
  }

  function onMessageDeleted({ messageId }: { messageId?: number }) {
    if (messageId === message.value?.id) {
      options.onMessageDeleted?.();
    }
  }

  async function fetchReplies() {
    if (isLoadingReplies.value) return;
    isLoadingReplies.value = true;
    try {
      replies.value = await channelApi.findReplies(message.value?.id);
    } catch (error) {
      console.error("Failed to fetch replies:", error);
    } finally {
      isLoadingReplies.value = false;
    }
  }

  async function sendReply(payload: { content: string; contentRich: any }) {
    if (!payload.content.trim()) return;
    if (!me.value) return;

    try {
      const reply = await channelApi.replyMessage(message.value?.id, payload.content, payload.contentRich);
      console.log("adding reply after sending it", options.name, reply);
      addReply(reply);
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  }

  async function toggleReaction(emoji: string) {
    try {
      const { reactions } = await channelApi.toggleMessageReaction(message.value?.id, emoji);
      message.value.reactions = reactions;
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  }

  async function toggleReplyReaction(replyId: number, emoji: string) {
    try {
      const { reactions } = await channelApi.toggleReplyReaction(replyId, emoji);
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
    replies.value.push(reply);
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
    fetchReplies,
    sendReply,
    deleteReply,
    toggleReaction,
    toggleReplyReaction,
  };
}
