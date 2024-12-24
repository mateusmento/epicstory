import { useDependency } from "@/core/dependency-injection";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { ChannelService, type CreateDirectChannel, type CreateGroupChannel } from "../services";
import type { IChannel } from "../types";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";

const useChannelsStore = defineStore("channels", () => {
  const channels = ref<IChannel[]>([]);
  return { channels };
});

export function useChannels() {
  const store = useChannelsStore();
  const sockets = useWebSockets();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const channelService = useDependency(ChannelService);

  function onReceiveMessage({ message, channelId }: any) {
    const channel = store.channels.find((c) => c.id === channelId);
    if (channel) channel.lastMessage = message;
  }

  async function subscribeMessages() {
    sockets.websocket.off("incoming-message", onReceiveMessage);

    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value?.id,
      userId: user.value?.id,
    });

    sockets.websocket?.on("incoming-message", onReceiveMessage);
  }

  async function fetchChannels() {
    if (!workspace.value) return;
    store.channels = await channelService.findChannels(workspace.value.id);
  }

  async function createChannel(data: CreateDirectChannel | CreateGroupChannel) {
    if (!workspace.value) return;
    const channel =
      data.type === "direct"
        ? await channelService.createDirectChannel(workspace.value.id, data)
        : await channelService.createGroupChannel(workspace.value.id, data);

    store.channels.unshift(channel);
    return channel;
  }

  return { ...storeToRefs(store), fetchChannels, subscribeMessages, createChannel };
}
