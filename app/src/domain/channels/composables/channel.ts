import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { useDependency } from "@/core/dependency-injection";
import { ChannelService } from "../services";
import type { IChannel, IMessage } from "../types";

export const useChannelStore = defineStore("channel", () => {
  const channel = ref<IChannel | null>(null);
  const messages = ref<IMessage[]>([]);
  return { channel, messages };
});

export function useChannel() {
  const store = useChannelStore();
  const channelApi = useDependency(ChannelService);

  function openChannel(channel: IChannel | null) {
    store.channel = channel;
  }

  function closeChannel() {
    store.channel = null;
  }

  async function fetchMessages() {
    if (!store.channel) return [];
    store.messages = await channelApi.findMessages(store.channel?.id);
  }

  return {
    ...storeToRefs(store),
    openChannel,
    fetchMessages,
    closeChannel,
  };
}
