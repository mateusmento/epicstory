import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { type User } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { last } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChannelApi } from "../services";
import type { IChannel, IMeeting, IMessage, IMessageGroup } from "../types";

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
      addMessage(message);
    }
  }

  function joinChannel() {
    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value.id,
    });

    sockets.websocket.off("incoming-message", onReceiveMessage);
    sockets.websocket?.on("incoming-message", onReceiveMessage);
  }

  function onIncomingMeeting({ meeting, channelId }: { meeting: IMeeting; channelId: number }) {
    if (store.channel?.id === channelId) store.channel.meeting = meeting;
  }

  function onMeetingEnded({ channelId }: { channelId: number }) {
    console.log("channel meeting-ended", { channelId });
    if (store.channel?.id === channelId) store.channel.meeting = null;
  }

  function subscribeMeetings() {
    sockets.websocket?.emit("subscribe-meetings", {
      workspaceId: workspace.value.id,
    });

    sockets.websocket.off("incoming-meeting", onIncomingMeeting);
    sockets.websocket.on("incoming-meeting", onIncomingMeeting);

    sockets.websocket.off("meeting-ended", onMeetingEnded);
    sockets.websocket.on("meeting-ended", onMeetingEnded);
  }

  function sendMessage(message: { content: string }) {
    if (!store.channel) return;
    if (!message.content) return;
    sockets.websocket?.emit("send-message", { channelId: store.channel.id, message, broadcastSelf: true });
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

  return {
    ...storeToRefs(store),
    messageGroups,
    openChannel,
    fetchChannel,
    fetchMessages,
    joinChannel,
    subscribeMeetings,
    sendMessage,
    fetchMembers,
    addMember,
    removeMember,
  };
}

function groupMessages(messages: IMessage[]) {
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
  const { fetchChannel, fetchMessages, joinChannel, fetchMembers, subscribeMeetings } = context;

  const route = useRoute();
  const channelId = computed(() => +route.params.channelId);

  onMounted(async () => {
    await fetchChannel(channelId.value);
    console.log("channel", context.channel.value?.id);
    joinChannel();
    fetchMessages();
    fetchMembers();
    subscribeMeetings();
  });

  watch(channelId, async () => {
    await fetchChannel(channelId.value);
    console.log("channel", context.channel.value?.id);
    joinChannel();
    fetchMessages();
    fetchMembers();
  });

  return context;
}
