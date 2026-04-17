import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useWorkspace } from "@/domain/workspace";
import { onUnmounted, ref, watch } from "vue";
import type { LiveScheduledMeeting } from "../services/meeting.api";
import { MeetingApi } from "../services/meeting.api";
import { useMeetingSocket } from "./meeting-socket";

export function useLiveMeeting() {
  const { workspace } = useWorkspace();
  const sockets = useWebSockets();
  const meetingSocket = useMeetingSocket();
  const meetingApi = useDependency(MeetingApi);

  const liveScheduledMeeting = ref<LiveScheduledMeeting | null>(null);
  const isLoadingLiveScheduledMeeting = ref(false);

  function subscribeMeetings(workspaceId: number) {
    meetingSocket.emitSubscribeMeetings(workspaceId);
  }

  async function refreshLiveScheduledMeeting() {
    const workspaceId = workspace.value?.id;
    if (!workspaceId) return;

    isLoadingLiveScheduledMeeting.value = true;
    try {
      liveScheduledMeeting.value = await meetingApi.findLiveScheduledMeeting(workspaceId);
    } finally {
      isLoadingLiveScheduledMeeting.value = false;
    }
  }

  function onMeetingSessionChanged() {
    console.log("meeting session changed");
    refreshLiveScheduledMeeting();
  }

  function onSocketConnected() {
    refreshLiveScheduledMeeting();
  }

  onUnmounted(() => {
    meetingSocket.offIncomingMeeting(onMeetingSessionChanged);
    meetingSocket.offMeetingEnded(onMeetingSessionChanged);
    sockets.websocket?.off("connect", onSocketConnected);
  });

  watch(
    () => workspace.value?.id,
    async () => {
      const workspaceId = workspace.value?.id;
      if (workspaceId) subscribeMeetings(workspaceId);
      await refreshLiveScheduledMeeting();

      meetingSocket.offIncomingMeeting(onMeetingSessionChanged);
      meetingSocket.onIncomingMeeting(onMeetingSessionChanged);

      meetingSocket.offMeetingEnded(onMeetingSessionChanged);
      meetingSocket.onMeetingEnded(onMeetingSessionChanged);

      sockets.websocket?.off("connect", onSocketConnected);
      sockets.websocket?.on("connect", onSocketConnected);
    },
    { immediate: true },
  );

  return {
    liveScheduledMeeting,
    isLoadingLiveScheduledMeeting,
    refreshLiveScheduledMeeting,
  };
}
