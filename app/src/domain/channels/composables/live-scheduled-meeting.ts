import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useWorkspace } from "@/domain/workspace";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { MeetingApi, type LiveScheduledMeeting } from "../services/meeting.api";

export function useLiveScheduledMeeting() {
  const { workspace } = useWorkspace();
  const sockets = useWebSockets();
  const meetingApi = useDependency(MeetingApi);

  const liveScheduledMeeting = ref<LiveScheduledMeeting | null>(null);
  const isLoadingLiveScheduledMeeting = ref(false);

  function subscribeWorkspaceMeetings(workspaceId: number) {
    sockets.websocket?.emit("subscribe-workspace-meetings", { workspaceId });
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
    void refreshLiveScheduledMeeting();
  }

  function onSocketConnected() {
    void refreshLiveScheduledMeeting();
  }

  onMounted(async () => {
    await refreshLiveScheduledMeeting();
  });

  onUnmounted(() => {
    sockets.websocket?.off("meeting-session-started", onMeetingSessionChanged);
    sockets.websocket?.off("meeting-session-ended", onMeetingSessionChanged);
    sockets.websocket?.off("connect", onSocketConnected);
  });

  watch(
    () => workspace.value?.id,
    async () => {
      const workspaceId = workspace.value?.id;
      if (workspaceId) subscribeWorkspaceMeetings(workspaceId);
      await refreshLiveScheduledMeeting();

      sockets.websocket?.off("meeting-session-started", onMeetingSessionChanged);
      sockets.websocket?.on("meeting-session-started", onMeetingSessionChanged);

      sockets.websocket?.off("meeting-session-ended", onMeetingSessionChanged);
      sockets.websocket?.on("meeting-session-ended", onMeetingSessionChanged);

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
