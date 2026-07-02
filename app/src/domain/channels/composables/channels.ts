import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { useMeetingSocket } from "@/domain/meetings";
import { useWorkspace } from "@/domain/workspace";
import { sortChannelsByRecentActivity, toMessageSummary } from "@/lib/channel";
import { ChannelApi } from "@epicstory/api-client";
import type {
  CreateChannelBody,
  IChannel,
  IncomingChannelActivityEvent,
  IncomingMeetingEvent,
  MeetingEndedEvent,
  SubscribeMessagesBody,
} from "@epicstory/contracts";
import { assign } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useChannelStore } from "./channel";

const RECENT_SIDEBAR_LIMIT = 5;

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

  function onReceiveChannelActivity({ activity, channelId }: IncomingChannelActivityEvent) {
    if (activity.type === "message_sent" && activity.message) {
      store.updateChannel(channelId, {
        lastMessage: toMessageSummary(activity.message),
      });
    }
  }

  function subscribeMessages() {
    const subscribeBody = { workspaceId: workspace.value.id } satisfies SubscribeMessagesBody;
    sockets.websocket?.emit("subscribe-messages", subscribeBody);

    sockets.websocket.off("incoming-channel-activity", onReceiveChannelActivity);
    sockets.websocket?.on("incoming-channel-activity", onReceiveChannelActivity);
  }

  function unsubscribeMessages() {
    sockets.websocket.off("incoming-channel-activity", onReceiveChannelActivity);
  }

  function onIncomingMeeting({ meeting, channelId }: IncomingMeetingEvent) {
    if (channelId != null) store.updateChannel(channelId, { meeting });
  }

  function onMeetingEnded({ channelId }: MeetingEndedEvent) {
    if (channelId != null) store.updateChannel(channelId, { meeting: null });
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

  async function createChannel(data: CreateChannelBody) {
    let channel;
    if (data.type === "direct") {
      channel =
        "peers" in data
          ? await channelApi.createDirectOrMultiDirectChannel(workspace.value.id, data)
          : await channelApi.createDirectChannel(workspace.value.id, data);
    } else if (data.type === "meeting") {
      channel = await channelApi.createMeetingChannel(workspace.value.id, data);
    } else {
      channel = await channelApi.createGroupChannel(workspace.value.id, data);
    }

    store.channels.unshift(channel);
    return channel;
  }

  const recentChannels = computed(() =>
    sortChannelsByRecentActivity(store.channels).slice(0, RECENT_SIDEBAR_LIMIT),
  );

  return {
    ...storeToRefs(store),
    recentChannels,
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

type RefreshFn = () => Promise<void> | void;

type ChannelActionOptions = {
  /**
   * Optional callback to refresh whichever list/view is currently showing channels.
   * Useful for views that manage their own pagination (e.g. AllTab's grouped pages).
   */
  refresh?: RefreshFn;
};

/**
 * Centralized "channel actions" (leave, rename, delete).
 *
 * UI components keep dialogs decoupled (they only open/confirm),
 * while this composable owns the API calls + shared side-effects:
 * - keep `useChannelsStore()` list in sync when present
 * - if the active channel is affected, navigate back to workspace dashboard
 */
export function useChannelActions() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const channelApi = useDependency(ChannelApi);

  const channelsStore = useChannelsStore();
  const channelStore = useChannelStore();

  async function navigateAwayIfActive(channelId: number) {
    if (channelStore.channel?.id !== channelId) return;
    channelStore.channel = null;
    await router.push({
      name: "workspace-dashboard",
      params: { workspaceId: workspace.value.id },
    });
  }

  async function leaveChannel(channel: Pick<IChannel, "id">, options: ChannelActionOptions = {}) {
    const me = user.value?.id;
    if (!me) return;

    await channelApi.removeMember(channel.id, me);

    // Keep the "messages" tab channel list in sync (best-effort).
    channelsStore.channels = channelsStore.channels.filter((c) => c.id !== channel.id);

    await navigateAwayIfActive(channel.id);
    await options.refresh?.();
  }

  async function renameChannel(channelId: number, nextName: string, options: ChannelActionOptions = {}) {
    const updated = await channelApi.renameChannel(channelId, nextName);

    // Keep both the channels list + currently open channel in sync (best-effort).
    channelsStore.updateChannel(updated.id, { name: updated.name });
    const active = channelStore.channel;
    if (active && active.id === updated.id) active.name = updated.name;

    await options.refresh?.();
    return updated;
  }

  async function deleteChannel(channel: Pick<IChannel, "id">, options: ChannelActionOptions = {}) {
    await channelApi.deleteChannel(channel.id);

    // Keep the "messages" tab channel list in sync (best-effort).
    channelsStore.channels = channelsStore.channels.filter((c) => c.id !== channel.id);

    await navigateAwayIfActive(channel.id);
    await options.refresh?.();
  }

  return { leaveChannel, renameChannel, deleteChannel };
}
