import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useMeetingSocket } from "@/domain/meetings";
import { useWorkspace } from "@/domain/workspace";
import { toMessageSummary } from "@/lib/channel";
import { useChannelsStore } from "./channels";
import { ChannelApi } from "@epicstory/api-client";
import type {
  CreateScheduledMessageBody,
  IChannel,
  IChannelActivity,
  IMessage,
  IncomingChannelActivityEvent,
  IncomingMeetingEvent,
  IReply,
  IUser,
  MeetingEndedEvent,
  MessageDeletedEvent,
  MessagePollUpdatedEvent,
  MessageUpdatedEvent,
  SendMessageBody,
  SubscribeMessagesBody,
  UpdateChannelMessageBody,
  UserTypingEvent,
  UserTypingStoppedEvent,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { last } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { IMessageGroup } from "../types/message.type";
import { buildChatTimeline, dedupeChannelActivities } from "../utils/build-chat-timeline";
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
  /** False while the window is attached to the live tip; true after jump-around / until loadNewer catches up. */
  const hasMoreNewer = ref(false);
  const loadingOlderActivities = ref(false);
  const loadingNewerActivities = ref(false);
  return {
    channel,
    activities,
    members,
    hasMoreOlder,
    hasMoreNewer,
    loadingOlderActivities,
    loadingNewerActivities,
  };
});

export function useChannel() {
  const store = useChannelStore();
  const channelsStore = useChannelsStore();
  const sockets = useWebSockets();
  const channelApi = useDependency(ChannelApi);
  const { workspace } = useWorkspace();
  const meetingSocket = useMeetingSocket();

  const chatTimeline = computed(() => buildChatTimeline(store.activities));

  const router = useRouter();

  function openChannel(channel: IChannel) {
    channelApi.markChannelRead(channel.id).catch(() => {});
    channelsStore.updateChannel(channel.id, { unreadMessagesCount: 0 });
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
    store.hasMoreNewer = false;
    const page = await channelApi.findChannelActivities(store.channel.id, {
      limit: CHANNEL_ACTIVITIES_PAGE_SIZE,
    });
    store.activities = dedupeChannelActivities(page.content);
    store.hasMoreOlder = page.hasNext;
    store.hasMoreNewer = false;
  }

  /**
   * Replace the timeline window with a contiguous slice around `messageId`.
   * Returns false if the message/activity is not found.
   */
  async function resetAroundMessage(messageId: number): Promise<boolean> {
    if (!store.channel) return false;
    try {
      const page = await channelApi.findChannelActivities(store.channel.id, {
        limit: CHANNEL_ACTIVITIES_PAGE_SIZE,
        aroundMessageId: messageId,
      });
      store.activities = dedupeChannelActivities(page.content);
      store.hasMoreOlder = page.hasNext;
      store.hasMoreNewer = page.hasPrevious;
      return store.activities.some((a) => a.type === "message_sent" && a.messageId === messageId);
    } catch {
      return false;
    }
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
      store.activities = dedupeChannelActivities([...page.content, ...store.activities]);
      // Only the older edge moves; stay on tip / historical newer flag unchanged.
      store.hasMoreOlder = page.hasNext;
    } finally {
      store.loadingOlderActivities = false;
    }
  }

  async function loadNewerActivitiesPage() {
    if (!store.channel || !store.hasMoreNewer || store.loadingNewerActivities) return;
    const newest = store.activities[store.activities.length - 1];
    if (!newest) return;
    store.loadingNewerActivities = true;
    try {
      const page = await channelApi.findChannelActivities(store.channel.id, {
        limit: CHANNEL_ACTIVITIES_PAGE_SIZE,
        afterCreatedAt: newest.createdAt,
        afterId: newest.id,
      });
      store.activities = dedupeChannelActivities([...store.activities, ...page.content]);
      store.hasMoreNewer = page.hasPrevious;
      // hasMoreOlder is unchanged (we only appended toward the tip).
    } finally {
      store.loadingNewerActivities = false;
    }
  }

  function onReceiveChannelActivity({ activity, channelId }: IncomingChannelActivityEvent) {
    if (!store.channel || store.channel.id !== channelId) return;
    // Historical window: keep contiguous; do not append tip events into a mid-history slice.
    if (store.hasMoreNewer) {
      if (activity.type === "message_sent" && activity.message) {
        store.channel.lastMessage = toMessageSummary(activity.message);
      }
      return;
    }
    insertActivity(activity);
    if (activity.type === "message_sent" && activity.message) {
      store.channel.lastMessage = toMessageSummary(activity.message);
    }
  }

  function onMessageDeleted({ messageId, channelId }: MessageDeletedEvent) {
    if (store.channel && store.channel.id === channelId) {
      store.activities = store.activities.filter(
        (a) => !(a.type === "message_sent" && a.messageId === messageId),
      );
    }
  }

  function onMessageUpdated({ message, channelId }: MessageUpdatedEvent) {
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

  function onUserTyping({ channelId, userId }: UserTypingEvent) {
    if (!store.channel || store.channel.id !== channelId) return;
    const next = new Map(typingActivity.value);
    next.set(userId, Date.now());
    typingActivity.value = next;
  }

  function onUserTypingStopped({ channelId, userId }: UserTypingStoppedEvent) {
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

  function onMessagePollUpdated(payload: MessagePollUpdatedEvent) {
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
    const subscribeBody = { workspaceId: workspace.value.id } satisfies SubscribeMessagesBody;
    sockets.websocket?.emit("subscribe-messages", subscribeBody);

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

  function onIncomingMeeting({ meeting, channelId }: IncomingMeetingEvent) {
    if (channelId && store.channel?.id === channelId) {
      store.channel.meeting = meeting;
    }
  }

  function onMeetingEnded({ meetingId }: MeetingEndedEvent) {
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

  async function sendMessage(body: SendMessageBody) {
    if (!store.channel) return;
    const { message, activity } = await channelApi.sendMessage(store.channel.id, body);
    // Sending from a historical window: return to the live tip so the new message is visible.
    if (store.hasMoreNewer) {
      await resetAndLoadLatestActivities();
    } else {
      insertActivity(activity);
    }
    if (store.channel) store.channel.lastMessage = toMessageSummary(message);
    return message;
  }

  async function sendScheduledMessage(body: CreateScheduledMessageBody) {
    if (!store.channel) return;
    return channelApi.postScheduledMessage(store.channel.id, body);
  }

  function sendDirectMessage(workspaceId: number, senderId: number, peers: number[], content: JSONContent) {
    return channelApi.sendDirectMessage(workspaceId, { senderId, peers, content });
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

  async function updateMessage(messageId: number, body: UpdateChannelMessageBody) {
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
      const { poll } = await channelApi.voteMessagePoll(messageId, { optionId });
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
    resetAroundMessage,
    loadOlderActivitiesPage,
    loadNewerActivitiesPage,
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
