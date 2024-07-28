import { InjectAxios } from "@/core/axios";
import { useDependency } from "@/core/dependency-injection";
import { useWorkspace } from "@/domain/workspace";
import type { Axios } from "axios";
import { defineStore, storeToRefs } from "pinia";
import { injectable } from "tsyringe";
import { onMounted, ref, watch } from "vue";
import type { Channel } from "../types";

const useChannelsStore = defineStore("channels", () => {
  const channels = ref<Channel[]>([]);
  return { channels };
});

@injectable()
export class ChannelService {
  constructor(@InjectAxios() private axios: Axios) {}

  findChannels(workspaceId: number) {
    return this.axios.get<Channel[]>(`/workspaces/${workspaceId}/channels`).then((res) => res.data);
  }

  createChannel(workspaceId: number, data: { name: string }) {
    return this.axios.post<Channel>(`/workspaces/${workspaceId}/channels`, data).then((res) => res.data);
  }
}

export function useChannels() {
  const store = useChannelsStore();
  const { workspace } = useWorkspace();

  const channelService = useDependency(ChannelService);

  async function fetchChannels() {
    if (!workspace.value) return;
    store.channels = await channelService.findChannels(workspace.value.id);
  }

  async function createChannel(data: { name: string }) {
    if (!workspace.value) return;
    const channel = await channelService.createChannel(workspace.value.id, data);
    store.channels.push(channel);
    return channel;
  }

  onMounted(fetchChannels);

  watch(workspace, fetchChannels);

  return { ...storeToRefs(store), fetchChannels, createChannel };
}
