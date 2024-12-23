import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import type { IChannel, IMeeting } from "../types";
import { useChannels } from "./channels";
import { useChannel } from "./channel";
import type { Socket } from "socket.io-client";

const useMeetingStore = defineStore("meeting", () => {
  const ongoingMeeting = ref<IMeeting | null>();
  return { ongoingMeeting };
});

export function createMeetingNotifications(websocket: Socket) {
  function subscribeMeetings(
    workspaceId: number,
    userId: number,
    {
      incomingMeeting,
      meetingEnded,
    }: {
      incomingMeeting: (data: { meeting: IMeeting }) => void;
      meetingEnded: (data: { meetingId: number; channelId: number }) => void;
    },
  ) {
    websocket.off("incoming-meeting");
    websocket.off("meeting-ended");
    websocket.emit("subscribe-meetings", { workspaceId, userId });
    websocket.on("incoming-meeting", incomingMeeting);
    websocket.on("meeting-ended", meetingEnded);
  }

  function requestMeeting(channelId: number) {
    return new Promise((res) => {
      websocket.emit("request-meeting", { channelId }, res);
    });
  }

  return {
    subscribeMeetings,
    requestMeeting,
  };
}

export function useMeeting() {
  const store = useMeetingStore();
  const sockets = useWebSockets();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { channels } = useChannels();
  const { channel: openChannel } = useChannel();

  async function subscribeMeetings() {
    sockets.websocket.off("incoming-meeting");
    sockets.websocket.off("meeting-ended");

    sockets.websocket.emit("subscribe-meetings", {
      workspaceId: workspace.value?.id,
      userId: user.value?.id,
    });

    sockets.websocket.on("incoming-meeting", ({ meeting }: any) => {
      const channel = channels.value.find((c) => c.id === meeting.channelId);
      if (channel) {
        channel.meeting = meeting;
      }
    });

    sockets.websocket.on("meeting-ended", ({ meetingId, channelId }: any) => {
      if (store.ongoingMeeting?.id === meetingId) {
        store.ongoingMeeting = null;
        if (openChannel.value) openChannel.value.meeting = null;
      }
      const channel = channels.value.find((c) => c.id === channelId);
      if (channel) channel.meeting = null;
    });
  }

  async function requestMeeting(channel: IChannel) {
    sockets.websocket.emit("request-meeting", { channelId: channel.id }, (data: any) => {
      store.ongoingMeeting = data;
      channel.meeting = data;
    });
  }

  async function joinMeeting(channel: IChannel) {
    openChannel.value = channel;
    store.ongoingMeeting = channel.meeting;
  }

  async function leaveOngoingMeeting() {
    store.ongoingMeeting = null;
  }

  async function endMeeting() {
    store.ongoingMeeting = null;
    if (openChannel.value) openChannel.value.meeting = null;
  }

  return {
    ...storeToRefs(store),
    subscribeMeetings,
    requestMeeting,
    joinMeeting,
    leaveOngoingMeeting,
    endMeeting,
  };
}
