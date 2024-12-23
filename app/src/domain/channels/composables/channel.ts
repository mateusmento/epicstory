import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { ChannelService } from "../services";
import type { IChannel, IMessage, IMessageGroup } from "../types";
import { last } from "lodash";
import type { User } from "@/domain/auth";

export const useChannelStore = defineStore("channel", () => {
  const channel = ref<IChannel | null>(null);
  const messages = ref<IMessage[]>([]);
  const members = ref<User[]>([]);
  return { channel, messages, members };
});

export function useChannel() {
  const store = useChannelStore();
  const channelApi = useDependency(ChannelService);
  const sockets = useWebSockets();

  function openChannel(channel: IChannel | null) {
    store.channel = channel;
  }

  function closeChannel() {
    store.channel = null;
  }

  const messageGroups = computed(() => groupMessages(store.messages));

  async function fetchMessages() {
    if (!store.channel) return [];
    store.messages = await channelApi.findMessages(store.channel?.id);
  }

  function onReceiveMessage(msg: any) {
    addMessage(msg);
  }

  function joinChannel() {
    if (!store.channel) return;

    sockets.websocket?.emit("join-channel", { channelId: store.channel.id });
    sockets.websocket.off("receive-message", onReceiveMessage);
    sockets.websocket?.on("receive-message", onReceiveMessage);
  }

  function sendMessage(message: { content: string }) {
    if (!store.channel) return;
    if (!message.content) return;
    const data = { channelId: store.channel.id, message };
    return new Promise((resolve) => {
      sockets.websocket?.emit("send-message", data, (msg: any) => {
        addMessage(msg);
        resolve(msg);
      });
    });
  }

  function addMessage(msg: IMessage) {
    store.messages.push(msg);
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
    openChannel,
    fetchMessages,
    closeChannel,
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
