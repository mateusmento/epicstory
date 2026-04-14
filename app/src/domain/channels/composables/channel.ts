import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { type User } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { last } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChannelApi } from "../services";
import type { IChannel, IMessage, IMessageGroup } from "../types";
import { useMeetingSocket, type IncomingMeetingPayload, type MeetingEndedPayload } from "./meeting-socket";

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
  }

  function leaveChannel() {
    sockets.websocket.off("incoming-message", onReceiveMessage);
    sockets.websocket.off("message-deleted", onMessageDeleted);
    sockets.websocket.off("message-updated", onMessageUpdated);
  }

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

  async function sendMessage({ content, contentRich }: { content: string; contentRich: any }) {
    if (!store.channel) return;
    if (!content) return;
    const message = await channelApi.sendMessage(store.channel.id, content, contentRich);
    addMessage(message);
    return message;
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
    openChannel,
    fetchChannel,
    fetchMessages,
    joinChannel,
    leaveChannel,
    subscribeMeetings,
    unsubscribeMeetings,
    sendMessage,
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

  watch(channelId, async (channelId) => {
    await fetchChannel(channelId);
    joinChannel();
    fetchMessages();
    fetchMembers();
  });

  return context;
}
