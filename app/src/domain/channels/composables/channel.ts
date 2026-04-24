import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { type User } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { last } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChannelApi } from "../services";
import type { ICreateScheduledMessageBody } from "../types/scheduled-message.type";
import type { IChannel, IMessage, IMessageGroup } from "../types";
import { useMeetingSocket, type IncomingMeetingPayload, type MeetingEndedPayload } from "./meeting-socket";
import { CHANNEL_TYPING_PRUNE_INTERVAL_MS, pruneStaleTyping } from "./typing";

/** Shared across all `useChannel()` callers */
const typingActivity = ref(new Map<number, number>());
let typingPruneTimer: ReturnType<typeof setInterval> | null = null;

export const useChannelStore = defineStore("channel", () => {
  const channel = ref<IChannel | null>(null);
  const messages = ref<IMessage[]>([]);
  const members = ref<User[]>([]);
  return { channel, messages, members };
});

export function useChannel() {
  const store = useChannelStore();
  const sockets = useWebSockets();
  const channelApi = useDependency(ChannelApi);
  const { workspace } = useWorkspace();
  const meetingSocket = useMeetingSocket();

  const messageGroups = computed(() => groupMessages(store.messages));

  const router = useRouter();

  function openChannel(channel: IChannel) {
    router.push(`/${workspace.value.id}/channel/${channel.id}`);
  }

  async function fetchChannel(channelId: number) {
    store.channel = await channelApi.findChannel(channelId);
  }

  async function fetchMessages() {
    if (!store.channel) return [];
    store.messages = await channelApi.findMessages(store.channel?.id);
  }

  function onReceiveMessage({ message, channelId }: any) {
    if (store.channel && store.channel.id === channelId) {
      addMessage({ ...message, replies: [] });
    }
  }

  function onMessageDeleted({ messageId, channelId }: any) {
    if (store.channel && store.channel.id === channelId) {
      store.messages = store.messages.filter((message) => message.id !== messageId);
    }
  }

  function onMessageUpdated({ message, channelId }: { message: IMessage; channelId: number }) {
    if (store.channel && store.channel.id === channelId) {
      const i = store.messages.findIndex((m) => m.id === message.id);
      if (i >= 0) {
        store.messages[i] = { ...store.messages[i], ...message };
      }
    }
  }

  function onUserTyping({ channelId, userId }: { channelId: number; userId: number }) {
    if (!store.channel || store.channel.id !== channelId) return;
    const next = new Map(typingActivity.value);
    next.set(userId, Date.now());
    typingActivity.value = next;
  }

  function onUserTypingStopped({ channelId, userId }: { channelId: number; userId: number }) {
    if (!store.channel || store.channel.id !== channelId) return;
    const next = new Map(typingActivity.value);
    next.delete(userId);
    typingActivity.value = next;
  }

  function tickTypingPrune() {
    const m = new Map(typingActivity.value);
    pruneStaleTyping(m);
    typingActivity.value = m;
  }

  function joinChannel() {
    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value.id,
    });

    sockets.websocket.off("incoming-message", onReceiveMessage);
    sockets.websocket?.on("incoming-message", onReceiveMessage);

    sockets.websocket.off("message-deleted", onMessageDeleted);
    sockets.websocket?.on("message-deleted", onMessageDeleted);

    sockets.websocket.off("message-updated", onMessageUpdated);
    sockets.websocket?.on("message-updated", onMessageUpdated);

    sockets.websocket.off("user-typing", onUserTyping);
    sockets.websocket?.on("user-typing", onUserTyping);

    sockets.websocket.off("user-typing-stopped", onUserTypingStopped);
    sockets.websocket?.on("user-typing-stopped", onUserTypingStopped);

    if (!typingPruneTimer) {
      typingPruneTimer = setInterval(() => {
        tickTypingPrune();
      }, CHANNEL_TYPING_PRUNE_INTERVAL_MS);
    }
  }

  function leaveChannel() {
    sockets.websocket.off("incoming-message", onReceiveMessage);
    sockets.websocket.off("message-deleted", onMessageDeleted);
    sockets.websocket.off("message-updated", onMessageUpdated);
    sockets.websocket.off("user-typing", onUserTyping);
    sockets.websocket.off("user-typing-stopped", onUserTypingStopped);

    if (typingPruneTimer) {
      clearInterval(typingPruneTimer);
      typingPruneTimer = null;
    }
    typingActivity.value = new Map();
  }

  const typingUserIds = computed(() => Array.from(typingActivity.value.keys()));

  watch(
    () => store.channel?.id,
    () => {
      typingActivity.value = new Map<number, number>();
    },
  );

  function onIncomingMeeting({ meeting, channelId }: IncomingMeetingPayload) {
    if (channelId && store.channel?.id === channelId) {
      store.channel.meeting = meeting;
    }
  }

  function onMeetingEnded({ meetingId }: MeetingEndedPayload) {
    if (store.channel?.meeting?.id === meetingId) store.channel.meeting = null;
  }

  function subscribeMeetings() {
    meetingSocket.emitSubscribeMeetings(workspace.value.id);

    meetingSocket.offIncomingMeeting(onIncomingMeeting);
    meetingSocket.onIncomingMeeting(onIncomingMeeting);

    meetingSocket.offMeetingEnded(onMeetingEnded);
    meetingSocket.onMeetingEnded(onMeetingEnded);
  }

  function unsubscribeMeetings() {
    meetingSocket.offIncomingMeeting(onIncomingMeeting);
    meetingSocket.offMeetingEnded(onMeetingEnded);
  }

  async function sendMessage({
    content,
    contentRich,
    quotedMessageId,
  }: {
    content: string;
    contentRich: any;
    quotedMessageId?: number | null;
  }) {
    if (!store.channel) return;
    if (!content) return;
    const message = await channelApi.sendMessage(store.channel.id, content, contentRich, quotedMessageId);
    addMessage(message);
    return message;
  }

  async function sendScheduledMessage(body: ICreateScheduledMessageBody) {
    if (!store.channel) return;
    return channelApi.postScheduledMessage(store.channel.id, body);
  }

  function sendDirectMessage(workspaceId: number, senderId: number, peers: number[], content: string) {
    return channelApi.sendDirectMessage(workspaceId, senderId, peers, content);
  }

  function addMessage(message: IMessage) {
    store.messages.push(message);
    if (store.channel) store.channel.lastMessage = message;
  }

  async function fetchMembers() {
    if (!store.channel) return;
    store.members = await channelApi.findMembers(store.channel.id);
  }

  async function addMember(userId: number) {
    if (!store.channel) return;
    const channel = await channelApi.addMember(store.channel.id, userId);
    store.members = channel.peers;
  }

  async function removeMember(memberId: number) {
    if (!store.channel) return;
    const channel = await channelApi.removeMember(store.channel.id, memberId);
    store.members = channel.peers;
  }

  async function deleteMessage(messageId: number) {
    if (!store.channel) return;
    await channelApi.deleteMessage(messageId);
    store.messages = store.messages.filter((message) => message.id !== messageId);
  }

  async function updateMessage(messageId: number, body: { content: string; contentRich: any }) {
    const updated = await channelApi.updateMessage(messageId, body);
    const i = store.messages.findIndex((m) => m.id === messageId);
    if (i >= 0) store.messages[i] = { ...store.messages[i], ...updated };
    return updated;
  }

  return {
    ...storeToRefs(store),
    messageGroups,
    typingUserIds,
    openChannel,
    fetchChannel,
    fetchMessages,
    joinChannel,
    leaveChannel,
    subscribeMeetings,
    unsubscribeMeetings,
    sendMessage,
    sendScheduledMessage,
    sendDirectMessage,
    fetchMembers,
    addMember,
    removeMember,
    deleteMessage,
    updateMessage,
  };
}

export function groupMessages(messages: IMessage[]) {
  return messages.reduce((groups, message) => {
    const lastGroup = last(groups);
    if (lastGroup && message.senderId === lastGroup.senderId) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        id: message.id,
        senderId: message.senderId,
        sender: message.sender,
        sentAt: message.sentAt,
        messages: [message],
      });
    }
    return groups;
  }, [] as IMessageGroup[]);
}

export function useSyncedChannel() {
  const context = useChannel();
  const {
    messages,
    fetchChannel,
    fetchMessages,
    fetchMembers,
    joinChannel,
    leaveChannel,
    subscribeMeetings,
    unsubscribeMeetings,
  } = context;

  const route = useRoute();
  const channelId = computed(() => +route.params.channelId);

  onMounted(async () => {
    messages.value = [];
    await fetchChannel(channelId.value);
    joinChannel();
    fetchMessages();
    fetchMembers();
    subscribeMeetings();
  });

  onUnmounted(() => {
    leaveChannel();
    unsubscribeMeetings();
  });

  watch(channelId, async (id) => {
    messages.value = [];
    await fetchChannel(id);
    joinChannel();
    fetchMessages();
    fetchMembers();
  });

  return context;
}
