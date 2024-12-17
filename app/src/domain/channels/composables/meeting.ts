import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import type { IChannel, IMeeting } from "../types";
import { useChannels } from "./channels";
import { useChannel } from "./channel";

const useMeetingStore = defineStore("meeting", () => {
  const ongoingMeeting = ref<IMeeting | null>();
  const incomingMeeting = ref<IMeeting | null>();
  return { ongoingMeeting, incomingMeeting };
});

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

    console.log("subscribe-meetings");
    sockets.websocket.emit("subscribe-meetings", {
      workspaceId: workspace.value?.id,
      userId: user.value?.id,
    });

    sockets.websocket.on("incoming-meeting", ({ meeting }: any) => {
      console.log("incoming meeting", meeting);
      store.incomingMeeting = meeting;
      const channel = channels.value.find((c) => c.id === meeting.channelId);
      if (channel) {
        channel.meeting = meeting;
      }
    });

    sockets.websocket.on("meeting-ended", ({ meetingId, channelId }: any) => {
      console.log("meeting-ended");
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
    store.incomingMeeting = null;
  }

  async function joinIncomingMeeting() {
    store.ongoingMeeting = store.incomingMeeting;
    store.incomingMeeting = null;
  }

  async function leaveOngoingMeeting() {
    store.ongoingMeeting = null;
  }

  return {
    ...storeToRefs(store),
    subscribeMeetings,
    requestMeeting,
    joinMeeting,
    joinIncomingMeeting,
    leaveOngoingMeeting,
  };
}
