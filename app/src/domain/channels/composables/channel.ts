import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useWorkspace } from "@/domain/workspace";
import { ChannelApi } from "@epicstory/api-client";
import type {
  CreateScheduledMessageBody,
  IChannel,
  IChannelActivity,
  IMessage,
  IReply,
  IUser,
  MessagePollBody,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { last } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { IMessageGroup } from "../types/message.type";
import { buildChatTimeline } from "../utils/build-chat-timeline";
import { useMeetingSocket, type IncomingMeetingPayload, type MeetingEndedPayload } from "@/domain/meetings";
import { CHANNEL_TYPING_PRUNE_INTERVAL_MS, pruneStaleTyping } from "./typing";

const CHANNEL_ACTIVITIES_PAGE_SIZE = 50;

/** Shared across all `useChannel()` callers */
const typingActivity = ref(new Map<number, number>());
let typingPruneTimer: ReturnType<typeof setInterval> | null = null;

export const useChannelStore = defineStore("channel", () => {
  const channel = ref<IChannel | null>(null);
  const activities = ref<IChannelActivity[]>([]);
  const members = ref<IUser[]>([]);
  const hasMoreOlder = ref(false);
  const loadingOlderActivities = ref(false);
  return { channel, activities, members, hasMoreOlder, loadingOlderActivities };
});

export function useChannel() {
  const store = useChannelStore();
  const sockets = useWebSockets();
  const channelApi = useDependency(ChannelApi);
  const { workspace } = useWorkspace();
  const meetingSocket = useMeetingSocket();

  const chatTimeline = computed(() => buildChatTimeline(store.activities));

  const router = useRouter();

  function openChannel(channel: IChannel) {
    router.push(`/${workspace.value.id}/channel/${channel.id}`);
  }

  async function fetchChannel(channelId: number) {
    store.channel = await channelApi.findChannel(channelId);
  }

  function insertActivity(activity: IChannelActivity) {
    const next = store.activities.filter((a) => a.id !== activity.id);
    next.push(activity);
    next.sort((a, b) => {
      const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (t !== 0) return t;
      return a.id - b.id;
    });
    store.activities = next;
  }

  async function resetAndLoadLatestActivities() {
    if (!store.channel) return;
    store.activities = [];
    store.hasMoreOlder = false;
    const page = await channelApi.findChannelActivities(store.channel.id, {
      limit: CHANNEL_ACTIVITIES_PAGE_SIZE,
    });
    store.activities = page.content;
    store.hasMoreOlder = page.hasNext;
  }

  async function loadOlderActivitiesPage() {
    if (!store.channel || !store.hasMoreOlder || store.loadingOlderActivities) return;
    const oldest = store.activities[0];
    if (!oldest) return;
    store.loadingOlderActivities = true;
    try {
      const page = await channelApi.findChannelActivities(store.channel.id, {
        limit: CHANNEL_ACTIVITIES_PAGE_SIZE,
        beforeCreatedAt: oldest.createdAt,
        beforeId: oldest.id,
      });
      const existing = new Set(store.activities.map((a) => a.id));
      store.activities = [
        ...page.content.filter((i: IChannelActivity) => !existing.has(i.id)),
        ...store.activities,
      ];
      store.hasMoreOlder = page.hasNext;
    } finally {
      store.loadingOlderActivities = false;
    }
  }

  function onReceiveChannelActivity({
    activity,
    channelId,
  }: {
    activity: IChannelActivity;
    channelId: number;
  }) {
    if (store.channel && store.channel.id === channelId) {
      insertActivity(activity);
      if (activity.type === "message_sent" && activity.message) {
        store.channel.lastMessage = activity.message;
      }
    }
  }

  function onMessageDeleted({ messageId, channelId }: { messageId: number; channelId: number }) {
    if (store.channel && store.channel.id === channelId) {
      store.activities = store.activities.filter(
        (a) => !(a.type === "message_sent" && a.messageId === messageId),
      );
    }
  }

  function onMessageUpdated({ message, channelId }: { message: IMessage; channelId: number }) {
    if (store.channel && store.channel.id === channelId) {
      const i = store.activities.findIndex((a) => a.type === "message_sent" && a.messageId === message.id);
      if (i >= 0) {
        const prev = store.activities[i];
        const next = [...store.activities];
        next[i] = { ...prev, message: { ...prev.message!, ...message } };
        store.activities = next;
      }
    }
  }

  function onUserTyping({ channelId, userId }: { channelId: number; userId: number }) {
    if (!store.channel || store.channel.id !== channelId) return;
    const next = new Map(typingActivity.value);
    next.set(userId, Date.now());
    typingActivity.value = next;
  }

  function onUserTypingStopped({ channelId, userId }: { channelId: number; userId: number }) {
    if (!store.channel || store.channel.id !== channelId) return;
    const next = new Map(typingActivity.value);
    next.delete(userId);
    typingActivity.value = next;
  }

  function tickTypingPrune() {
    const m = new Map(typingActivity.value);
    pruneStaleTyping(m);
    typingActivity.value = m;
  }

  function onMessagePollUpdated(payload: {
    channelId: number;
    messageId: number;
    optionVotes: Record<string, number>;
    totalVotes: number;
  }) {
    if (!store.channel || store.channel.id !== payload.channelId) return;
    const i = store.activities.findIndex(
      (a) => a.type === "message_sent" && a.messageId === payload.messageId,
    );
    if (i < 0) return;
    const msg = store.activities[i].message;
    if (!msg) return;
    const prevPoll = msg.poll;
    const next = [...store.activities];
    next[i] = {
      ...store.activities[i],
      message: {
        ...msg,
        poll: prevPoll
          ? {
              ...prevPoll,
              optionVotes: payload.optionVotes,
              totalVotes: payload.totalVotes,
            }
          : undefined,
      },
    };
    store.activities = next;
  }

  function joinChannel() {
    sockets.websocket?.emit("subscribe-messages", {
      workspaceId: workspace.value.id,
    });

    sockets.websocket.off("incoming-channel-activity", onReceiveChannelActivity);
    sockets.websocket?.on("incoming-channel-activity", onReceiveChannelActivity);

    sockets.websocket.off("message-deleted", onMessageDeleted);
    sockets.websocket?.on("message-deleted", onMessageDeleted);

    sockets.websocket.off("message-updated", onMessageUpdated);
    sockets.websocket?.on("message-updated", onMessageUpdated);

    sockets.websocket.off("message-poll-updated", onMessagePollUpdated);
    sockets.websocket?.on("message-poll-updated", onMessagePollUpdated);

    sockets.websocket.off("user-typing", onUserTyping);
    sockets.websocket?.on("user-typing", onUserTyping);

    sockets.websocket.off("user-typing-stopped", onUserTypingStopped);
    sockets.websocket?.on("user-typing-stopped", onUserTypingStopped);

    if (!typingPruneTimer) {
      typingPruneTimer = setInterval(() => {
        tickTypingPrune();
      }, CHANNEL_TYPING_PRUNE_INTERVAL_MS);
    }
  }

  function leaveChannel() {
    sockets.websocket.off("incoming-channel-activity", onReceiveChannelActivity);
    sockets.websocket.off("message-deleted", onMessageDeleted);
    sockets.websocket.off("message-updated", onMessageUpdated);
    sockets.websocket.off("message-poll-updated", onMessagePollUpdated);
    sockets.websocket.off("user-typing", onUserTyping);
    sockets.websocket.off("user-typing-stopped", onUserTypingStopped);

    if (typingPruneTimer) {
      clearInterval(typingPruneTimer);
      typingPruneTimer = null;
    }
    typingActivity.value = new Map();
  }

  const typingUserIds = computed(() => Array.from(typingActivity.value.keys()));

  watch(
    () => store.channel?.id,
    () => {
      typingActivity.value = new Map<number, number>();
    },
  );

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
    meetingSocket.onIncomingMeeting(onIncomingMeeting);
    meetingSocket.onMeetingEnded(onMeetingEnded);
  }

  function unsubscribeMeetings() {
    meetingSocket.offIncomingMeeting(onIncomingMeeting);
    meetingSocket.offMeetingEnded(onMeetingEnded);
  }

  async function sendMessage({
    content,
    quotedMessageId,
    attachmentIds,
    poll,
  }: {
    content: JSONContent;
    quotedMessageId?: number | null;
    attachmentIds?: number[];
    poll?: MessagePollBody;
  }) {
    if (!store.channel) return;
    const { message, activity } = await channelApi.sendMessage(
      store.channel.id,
      content,
      quotedMessageId,
      attachmentIds,
      poll,
    );
    insertActivity(activity);
    if (store.channel) store.channel.lastMessage = message;
    return message;
  }

  async function sendScheduledMessage(body: CreateScheduledMessageBody) {
    if (!store.channel) return;
    return channelApi.postScheduledMessage(store.channel.id, body);
  }

  function sendDirectMessage(workspaceId: number, senderId: number, peers: number[], content: JSONContent) {
    return channelApi.sendDirectMessage(workspaceId, senderId, peers, content);
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
    store.activities = store.activities.filter(
      (a) => !(a.type === "message_sent" && a.messageId === messageId),
    );
  }

  async function updateMessage(
    messageId: number,
    body: {
      content: JSONContent;
      attachmentIds?: number[];
      poll?: MessagePollBody | null;
    },
  ) {
    const updated = await channelApi.updateMessage(messageId, body);
    const i = store.activities.findIndex((a) => a.type === "message_sent" && a.messageId === messageId);
    if (i >= 0) {
      const prev = store.activities[i];
      const next = [...store.activities];
      next[i] = { ...prev, message: { ...prev.message!, ...updated } };
      store.activities = next;
    }
    return updated;
  }

  const votingPollOptionId = ref<string | null>(null);
  const votingPollMessageId = ref<number | null>(null);

  async function voteMessagePoll(messageId: number, optionId: string) {
    if (votingPollOptionId.value) return;
    votingPollOptionId.value = optionId;
    votingPollMessageId.value = messageId;
    try {
      const { poll } = await channelApi.voteMessagePoll(messageId, optionId);
      const i = store.activities.findIndex((a) => a.type === "message_sent" && a.messageId === messageId);
      if (i >= 0) {
        const act = store.activities[i];
        const msg = act.message!;
        const next = [...store.activities];
        next[i] = { ...act, message: { ...msg, poll } };
        store.activities = next;
      }
      return poll;
    } finally {
      votingPollOptionId.value = null;
      votingPollMessageId.value = null;
    }
  }

  return {
    ...storeToRefs(store),
    chatTimeline,
    typingUserIds,
    openChannel,
    fetchChannel,
    resetAndLoadLatestActivities,
    loadOlderActivitiesPage,
    joinChannel,
    leaveChannel,
    subscribeMeetings,
    unsubscribeMeetings,
    sendMessage,
    sendScheduledMessage,
    sendDirectMessage,
    fetchMembers,
    addMember,
    removeMember,
    deleteMessage,
    updateMessage,
    voteMessagePoll,
    votingPollOptionId,
    votingPollMessageId,
  };
}

export function groupMessages<M extends IMessage | IReply>(messages: M[]) {
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
  }, [] as IMessageGroup<M>[]);
}

export function useSyncedChannel() {
  const context = useChannel();
  const {
    activities,
    fetchChannel,
    resetAndLoadLatestActivities,
    fetchMembers,
    joinChannel,
    leaveChannel,
    subscribeMeetings,
    unsubscribeMeetings,
  } = context;

  const route = useRoute();
  const channelId = computed(() => +route.params.channelId);

  onMounted(async () => {
    activities.value = [];
    await fetchChannel(channelId.value);
    joinChannel();
    resetAndLoadLatestActivities();
    fetchMembers();
    subscribeMeetings();
  });

  onUnmounted(() => {
    leaveChannel();
    unsubscribeMeetings();
  });

  watch(channelId, async (id) => {
    activities.value = [];
    await fetchChannel(id);
    joinChannel();
    resetAndLoadLatestActivities();
    fetchMembers();
  });

  return context;
}
