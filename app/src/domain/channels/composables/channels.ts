import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { ChannelApi, type CreateDirectChannel, type CreateGroupChannel } from "../services";
import type { IChannel } from "../types";
import { assign } from "lodash";
import { useMeetingSocket } from "./meeting-socket";

const useChannelsStore = defineStore("channels", () => {
  const channels = ref<IChannel[]>([]);

  function findChannel(channelId: number) {
    return channels.value.find((c) => c.id === channelId);
  }

  function updateChannel(id: number, data: Partial<IChannel>) {
    const channel = findChannel(id);
    if (channel) assign(channel, data);
  }

  return { channels, findChannel, updateChannel };
});

export function useChannels() {
  const store = useChannelsStore();
  const sockets = useWebSockets();
  const { workspace } = useWorkspace();
  const meetingSocket = useMeetingSocket();

  const channelApi = useDependency(ChannelApi);

  function onReceiveMessage({ message, channelId }: any) {
    store.updateChannel(channelId, { lastMessage: message });
  }

  function subscribeMessages() {
    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value.id,
    });

    sockets.websocket.off("incoming-message", onReceiveMessage);
    sockets.websocket?.on("incoming-message", onReceiveMessage);
  }

  function unsubscribeMessages() {
    sockets.websocket.off("incoming-message", onReceiveMessage);
  }

  function onIncomingMeeting({ meeting, channelId }: any) {
    store.updateChannel(channelId, { meeting });
  }

  function onMeetingEnded({ channelId }: any) {
    store.updateChannel(channelId, { meeting: null });
  }

  function subscribeMeetings() {
    meetingSocket.emitSubscribeMeetings(workspace.value.id);

    meetingSocket.onIncomingMeeting(onIncomingMeeting);
    meetingSocket.onMeetingEnded(onMeetingEnded);
  }

  function unsubscribeMeetings() {
    meetingSocket.offIncomingMeeting(onIncomingMeeting);
    meetingSocket.offMeetingEnded(onMeetingEnded);
  }

  async function fetchChannels() {
    store.channels = await channelApi.findChannels(workspace.value.id);
  }

  async function createChannel(data: CreateDirectChannel | CreateGroupChannel) {
    const channel =
      data.type === "direct"
        ? await channelApi.createDirectChannel(workspace.value.id, data)
        : await channelApi.createGroupChannel(workspace.value.id, data);

    store.channels.unshift(channel);
    return channel;
  }

  return {
    ...storeToRefs(store),
    fetchChannels,
    subscribeMessages,
    unsubscribeMessages,
    subscribeMeetings,
    unsubscribeMeetings,
    createChannel,
  };
}

export function useSyncedChannels() {
  const { workspace } = useWorkspace();
  const context = useChannels();
  const { fetchChannels, subscribeMessages, unsubscribeMessages, subscribeMeetings, unsubscribeMeetings } =
    context;

  onMounted(async () => {
    await fetchChannels();
    subscribeMeetings();
    subscribeMessages();
  });

  onUnmounted(() => {
    unsubscribeMessages();
    unsubscribeMeetings();
  });

  watch(workspace, async () => {
    await fetchChannels();
    subscribeMeetings();
    subscribeMessages();
  });

  return context;
}
