import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import { defineStore, storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, type Ref } from "vue";
import type { IMessage, IReaction, IReply } from "../types";

export const useMessageThreadStore = defineStore("messageThread", () => {
  const message = ref<IMessage>();
  const replies = ref<IReply[]>([]);
  const reactions = ref<IReaction[]>([]);
  const replyReactions = ref<Record<number, IReaction[]>>({});

  return { message, replies, reactions, replyReactions };
});

export function useMessageThread(message: Ref<IMessage>) {
  const store = useMessageThreadStore();
  const isLoadingReplies = ref(false);
  const replyContent = ref("");

  const channelApi = useDependency(ChannelApi);
  const { websocket } = useWebSockets();

  async function fetchReplies() {
    if (isLoadingReplies.value) return;
    isLoadingReplies.value = true;
    try {
      store.replies = await channelApi.findReplies(message.value?.id);
      // Fetch reactions for each reply
      for (const reply of store.replies) {
        await fetchReplyReactions(reply.id);
      }
    } catch (error) {
      console.error("Failed to fetch replies:", error);
    } finally {
      isLoadingReplies.value = false;
    }
  }

  async function onIncomingReply({ reply, messageId }: { reply: IReply; messageId: number }) {
    if (messageId === message.value?.id) {
      store.replies.push(reply);
      // Fetch reactions for the new reply
      await fetchReplyReactions(reply.id);
    }
  }

  async function sendReply() {
    if (!replyContent.value.trim()) return;

    try {
      const reply = await channelApi.replyMessage(message.value?.id, replyContent.value);
      store.replies.push(reply);
      replyContent.value = "";
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  }

  // Subscribe to incoming replies
  onMounted(() => {
    websocket?.off("incoming-reply", onIncomingReply);
    websocket?.on("incoming-reply", onIncomingReply);
  });

  onUnmounted(() => {
    websocket?.off("incoming-reply", onIncomingReply);
  });

  onMounted(() => {
    fetchReactions();
    websocket?.off("incoming-message-reaction", onIncomingReaction);
    websocket?.on("incoming-message-reaction", onIncomingReaction);

    websocket?.off("incoming-reply-reaction", onIncomingReaction);
    websocket?.on("incoming-reply-reaction", onIncomingReaction);
  });

  onUnmounted(() => {
    websocket?.off("incoming-message-reaction", onIncomingReaction);
    websocket?.off("incoming-reply-reaction", onIncomingReaction);
  });

  function onIncomingReaction({
    messageId,
    replyId,
    reactions: updatedReactions,
  }: {
    messageId?: number;
    replyId?: number;
    reactions?: IReaction[];
  }) {
    if (messageId === message.value?.id && updatedReactions) {
      store.reactions = updatedReactions;
      message.value.reactions = updatedReactions;
    } else if (replyId && updatedReactions) {
      store.replyReactions[replyId] = updatedReactions;
    }
  }

  async function fetchReactions() {
    try {
      store.reactions = await channelApi.findReactions(message.value?.id);
    } catch (error) {
      console.error("Failed to fetch reactions:", error);
    }
  }

  async function fetchReplyReactions(replyId: number) {
    try {
      store.replyReactions[replyId] = await channelApi.findReplyReactions(replyId);
    } catch (error) {
      console.error("Failed to fetch reply reactions:", error);
    }
  }

  async function toggleReaction(emoji: string) {
    try {
      const { action, reactions: updatedReactions } = await channelApi.toggleMessageReaction(message.value?.id, emoji);

      // if (action === "added") {
      //   reactions.value.push({ emoji, reactedBy: me.value ? [me.value.id] : [] });
      // } else if (action === "removed") {
      //   reactions.value = reactions.value.filter((reaction) => reaction.emoji !== emoji);
      // }

      message.value.reactions = updatedReactions;

    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  }

  async function toggleReplyReaction(replyId: number, emoji: string) {
    try {
      const { action, reactions: updatedReactions } = await channelApi.toggleReplyReaction(replyId, emoji);

      // if (action === "added") {
      //   replyReactions.value[replyId].push({ emoji, reactedBy: me.value ? [me.value.id] : [] });
      // } else if (action === "removed") {
      //   replyReactions.value[replyId] = replyReactions.value[replyId].filter((reaction) => reaction.emoji !== emoji);
      // }

      store.replies = store.replies.map((reply) => reply.id === replyId ? { ...reply, reactions: updatedReactions } : reply);
      // store.replyReactions[replyId] = updatedReactions;
    } catch (error) {
      console.error("Failed to toggle reply reaction:", error);
    }
  }

  async function deleteMessage() {
    try {
      await channelApi.deleteMessage(message.value?.id);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  }

  async function deleteReply(replyId: number) {
    try {
      await channelApi.deleteReply(replyId);
      store.replies = store.replies.filter((reply) => reply.id !== replyId);
      delete store.replyReactions[replyId];
    } catch (error) {
      console.error("Failed to delete reply:", error);
    }
  }

  return {
    ...storeToRefs(store),
    isLoadingReplies,
    replyContent,
    fetchReplies,
    sendReply,
    deleteMessage,
    deleteReply,
    toggleReaction,
    toggleReplyReaction,
  };
}
