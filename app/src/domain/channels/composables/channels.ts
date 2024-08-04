import { useDependency } from "@/core/dependency-injection";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";
import type { IChannel } from "../types";
import { ChannelService, type CreateDirectChannel, type CreateGroupChannel } from "../services";

const useChannelsStore = defineStore("channels", () => {
  const channels = ref<IChannel[]>([]);
  return { channels };
});

export function useChannels() {
  const store = useChannelsStore();
  const { workspace } = useWorkspace();

  const channelService = useDependency(ChannelService);

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

  onMounted(fetchChannels);

  watch(workspace, fetchChannels);

  return { ...storeToRefs(store), fetchChannels, createChannel };
}
