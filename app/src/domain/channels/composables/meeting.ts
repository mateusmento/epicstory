import { useWebSockets } from "@/core/websockets";
import { defineStore, storeToRefs } from "pinia";
import { onMounted, ref } from "vue";
import type { IMeeting } from "../types";

const useMeetingStore = defineStore("meeting", () => {
  const ongoingMeeting = ref<IMeeting | null>();
  const incomingMeeting = ref<IMeeting | null>();
  return { ongoingMeeting, incomingMeeting };
});

export function useMeeting() {
  const store = useMeetingStore();
  const sockets = useWebSockets();

  onMounted(async () => {
    sockets.websocket.on("incoming-meeting", ({ meeting }: any) => {
      store.incomingMeeting = meeting;
    });

    sockets.websocket.on("meeting-ended", () => {
      store.ongoingMeeting = null;
    });
  });

  async function requestMeeting(channelId: number) {
    sockets.websocket.emit("request-meeting", { channelId }, (data: any) => {
      store.ongoingMeeting = data;
    });
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
    requestMeeting,
    joinIncomingMeeting,
    leaveOngoingMeeting,
  };
}
