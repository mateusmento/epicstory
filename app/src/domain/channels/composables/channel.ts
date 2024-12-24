import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth, type User } from "@/domain/auth";
import { last } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { ChannelService } from "../services";
import type { IChannel, IMessage, IMessageGroup } from "../types";
import { useWorkspace } from "@/domain/workspace";

export const useChannelStore = defineStore("channel", () => {
  const channel = ref<IChannel | null>(null);
  const messages = ref<IMessage[]>([]);
  const members = ref<User[]>([]);
  return { channel, messages, members };
});

export function useChannel() {
  const store = useChannelStore();
  const sockets = useWebSockets();
  const channelApi = useDependency(ChannelService);
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  async function fetchChannel(channelId: number) {
    store.channel = await channelApi.findChannel(channelId);
  }

  const messageGroups = computed(() => groupMessages(store.messages));

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
    sockets.websocket.off("incoming-message", onReceiveMessage);

    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value?.id,
      userId: user.value?.id,
    });

    sockets.websocket?.on("incoming-message", onReceiveMessage);
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

  return {
    ...storeToRefs(store),
    messageGroups,
    fetchChannel,
    fetchMessages,
    joinChannel,
    sendMessage,
    fetchMembers,
    addMember,
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
