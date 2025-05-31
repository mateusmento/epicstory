import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";
import { ChannelApi, type CreateDirectChannel, type CreateGroupChannel } from "../services";
import type { IChannel } from "../types";

const useChannelsStore = defineStore("channels", () => {
  const channels = ref<IChannel[]>([]);
  return { channels };
});

export function useChannels() {
  const store = useChannelsStore();
  const sockets = useWebSockets();
  const { workspace } = useWorkspace();

  const channelApi = useDependency(ChannelApi);

  function onReceiveMessage({ message, channelId }: any) {
    const channel = store.channels.find((c) => c.id === channelId);
    if (channel) channel.lastMessage = message;
  }

  function subscribeMessages() {
    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value?.id,
    });

    sockets.websocket.off("incoming-message", onReceiveMessage);
    sockets.websocket?.on("incoming-message", onReceiveMessage);
  }

  function onIncomingMeeting({ meeting, channelId }: any) {
    const channel = store.channels.find((c) => c.id === channelId);
    if (channel) channel.meeting = meeting;
    console.log("incoming-meeting", { channelId, channel });
  }

  function onMeetingEnded({ channelId }: any) {
    console.log("channels meeting-ended", { channelId });
    const channel = store.channels.find((c) => c.id === channelId);
    if (channel) channel.meeting = null;
  }

  function subscribeMeetings() {
    sockets.websocket?.emit("subscribe-meetings", {
      workspaceId: workspace.value?.id,
    });

    console.log("channels subscribe meetings");
    sockets.websocket.off("incoming-meeting", onIncomingMeeting);
    sockets.websocket.on("incoming-meeting", onIncomingMeeting);

    sockets.websocket.off("meeting-ended", onMeetingEnded);
    sockets.websocket.on("meeting-ended", onMeetingEnded);
  }

  async function fetchChannels() {
    if (!workspace.value) return;
    store.channels = await channelApi.findChannels(workspace.value.id);
  }

  async function createChannel(data: CreateDirectChannel | CreateGroupChannel) {
    if (!workspace.value) return;
    const channel =
      data.type === "direct"
        ? await channelApi.createDirectChannel(workspace.value.id, data)
        : await channelApi.createGroupChannel(workspace.value.id, data);

    store.channels.unshift(channel);
    return channel;
  }

  return { ...storeToRefs(store), fetchChannels, subscribeMessages, subscribeMeetings, createChannel };
}

export function useSyncedChannels() {
  const { workspace } = useWorkspace();
  const context = useChannels();
  const { fetchChannels, subscribeMessages, subscribeMeetings } = context;

  onMounted(async () => {
    await fetchChannels();
    subscribeMeetings();
    subscribeMessages();
  });

  watch(workspace, async () => {
    await fetchChannels();
    subscribeMeetings();
    subscribeMessages();
  });

  return context;
}
