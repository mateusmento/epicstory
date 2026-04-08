import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import type { User } from "@/domain/auth";
import { ChannelApi } from "@/domain/channels/services";
import { MeetingApi } from "@/domain/channels/services/meeting.api";
import type { MediaStreaming } from "@/domain/channels/utils/media-streaming";
import { createMediaStreaming, untilOpen } from "@/domain/channels/utils/media-streaming";
import {
  createActiveSpeakerDetector,
  type ActiveSpeakerDetector,
  type SpeakerId,
} from "@/domain/channels/utils/active-speaker";
import { useWorkspace } from "@/domain/workspace";
import Peer from "peerjs";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";
import type { IChannel, IMeeting, IMeetingAttendee } from "../types";
import { useMeetingSocket } from "./meeting-socket";

export type MeetingStreamingAttendee = {
  remoteId: string;
  camera: MediaStream;
  user: User;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
};

export function useMeeting() {
  const store = useMeetingStore();
  return {
    ...store,
    ...storeToRefs(store),
  };
}

const useMeetingStore = defineStore("meeting", () => {
  const sockets = useWebSockets();
  const { workspace } = useWorkspace();
  const meetingSocket = useMeetingSocket();

  const incomingMeeting = ref<IMeeting | null>(null);
  const currentMeeting = ref<IMeeting | null>();
  const streaming = shallowRef<MediaStreaming | null>();

  const localRemoteId = ref<string | null>(null);
  const mycamera = ref<MediaStream | null>(null);
  const attendees = ref<MeetingStreamingAttendee[]>([]);

  const isCameraOn = ref(true);
  const isMicrophoneOn = ref(true);

  // --- Layout mode (meeting grid) ---
  const layoutMode = ref<"speaker" | "grid">("speaker");
  const peersDock = ref<"both" | "top" | "right">("both");
  const topDockMax = ref<number>(4);

  // --- Active speaker detection ---
  const speakingIds = ref<Set<SpeakerId>>(new Set());
  const activeSpeakerId = ref<SpeakerId | null>(null);
  const pinnedSpeakerId = ref<SpeakerId | null>(null);
  const detector = shallowRef<ActiveSpeakerDetector | null>(null);

  const meetingApi = useDependency(MeetingApi);
  const channelApi = useDependency(ChannelApi);

  const currentMeetingChannelType = ref<IChannel["type"] | null>(null);

  const sources = computed(() => {
    const src: { id: SpeakerId; stream: MediaStream | null }[] = [];
    src.push({ id: "local", stream: mycamera.value });
    for (const a of attendees.value) src.push({ id: a.remoteId, stream: a.camera });
    return src;
  });

  function setLayoutMode(mode: "speaker" | "grid") {
    layoutMode.value = mode;
  }

  function setPeersDock(dock: "both" | "top" | "right") {
    peersDock.value = dock;
  }

  function setTopDockMax(n: number) {
    topDockMax.value = Math.max(0, Math.floor(n));
  }

  function pinSpeaker(id: SpeakerId) {
    pinnedSpeakerId.value = id;
    // Decision: pinning from grid should switch to speaker focus.
    if (layoutMode.value === "grid") layoutMode.value = "speaker";
  }

  function unpinSpeaker() {
    pinnedSpeakerId.value = null;
  }

  function togglePinSpeaker(id: SpeakerId) {
    if (pinnedSpeakerId.value === id) {
      pinnedSpeakerId.value = null;
      return;
    }
    pinnedSpeakerId.value = id;
    // Decision: pinning from grid should switch to speaker focus.
    if (layoutMode.value === "grid") layoutMode.value = "speaker";
  }

  function setupDetector() {
    if (detector.value) return;
    detector.value = createActiveSpeakerDetector(({ speakingIds: nextSpeaking, newestSpeakerId }) => {
      speakingIds.value = nextSpeaking;
      if (!pinnedSpeakerId.value) activeSpeakerId.value = newestSpeakerId;
    });
  }

  function syncDetectorSources() {
    setupDetector();
    detector.value?.setSources(sources.value);
    void detector.value?.resume();
  }

  function teardownDetector() {
    detector.value?.stop();
    detector.value = null;
    speakingIds.value = new Set();
    activeSpeakerId.value = null;
    pinnedSpeakerId.value = null;
  }

  async function subscribeMeetings() {
    meetingSocket.emitSubscribeMeetings(workspace.value.id);
    meetingSocket.onIncomingMeeting(onIncomingMeeting);
    meetingSocket.onMeetingEnded(onMeetingEnded);
  }

  async function getCamera() {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.log("Joining meeting without camera permission", error);
        return;
      }
    }
  }

  async function connectMeeting(
    {
      camera: existingCamera,
    }: {
      camera?: MediaStream;
    },
    meetingFactory: (data: {
      remoteId: string;
      isCameraOn: boolean;
      isMicrophoneOn: boolean;
    }) => Promise<IMeeting>,
  ) {
    const camera = existingCamera ?? (await getCamera());

    if (!camera) {
      console.log("Can not join meeting without camera permission");
      return;
    }

    mycamera.value = camera;

    // Start (or refresh) active speaker detection once we have a local stream.
    syncDetectorSources();

    const rtc = await untilOpen(
      new Peer({
        host: config.PEERJS_SERVER_HOST,
        port: config.PEERJS_SERVER_PORT,
        path: config.PEERJS_SERVER_PATH,
        secure: (config as any).PEERJS_SERVER_SECURE ?? window.location.protocol === "https:",
      }),
    );

    localRemoteId.value = rtc.id;

    streaming.value = createMediaStreaming({
      rtc,
      media: camera,
      async mediaAdded(remoteId, camera) {
        const [attendee] = await meetingApi.findAttendees({ remoteId, meetingId: meeting.id });
        attendees.value.push({
          remoteId,
          camera,
          user: attendee?.user,
          isCameraOn: attendee?.isCameraOn ?? false,
          isMicrophoneOn: attendee?.isMicrophoneOn ?? false,
        });
        syncDetectorSources();
      },
    });

    const data = {
      remoteId: streaming.value.localId,
      isCameraOn: isCameraOn.value,
      isMicrophoneOn: isMicrophoneOn.value,
    };

    const meeting = await meetingFactory(data);

    currentMeeting.value = meeting;
    currentMeetingChannelType.value = null;
    if (meeting?.channelId) {
      try {
        const channel = await channelApi.findChannel(meeting.channelId);
        currentMeetingChannelType.value = channel.type;
      } catch {
        currentMeetingChannelType.value = null;
      }
    }

    subscribeMeetings();

    sockets.websocket.off("attendee-left", attendeeLeft);
    sockets.websocket.off("attendee-joined", attendeeJoined);
    sockets.websocket.off("camera-toggled", onCameraToggled);
    sockets.websocket.off("microphone-toggled", onMicrophoneToggled);

    sockets.websocket.on("attendee-left", attendeeLeft);
    sockets.websocket.on("attendee-joined", attendeeJoined);
    sockets.websocket.on("camera-toggled", onCameraToggled);
    sockets.websocket.on("microphone-toggled", onMicrophoneToggled);
    sockets.websocket.once("current-meeting-ended", onCurrentMeetingEnded);

    sockets.websocket.listeners("attendee-joined");

    return meeting;
  }

  async function joinMeeting({ meetingId, camera }: { meetingId: number; camera?: MediaStream }) {
    incomingMeeting.value = null;
    return connectMeeting({ camera }, async (data) => {
      return await new Promise<IMeeting>((res) => {
        console.log("join-meeting", { ...data, meetingId });
        sockets.websocket.emit("join-meeting", { ...data, meetingId }, (m: IMeeting) => res(m));
      });
    });
  }

  function joinScheduledMeeting({
    calendarEventId,
    occurrenceAt,
    camera,
  }: {
    calendarEventId: string;
    occurrenceAt: Date;
    camera?: MediaStream;
  }) {
    incomingMeeting.value = null;
    return connectMeeting({ camera }, async (data) => {
      const joinData = {
        ...data,
        calendarEventId,
        occurrenceAt: occurrenceAt ? occurrenceAt.toISOString() : undefined,
      };
      return await new Promise<IMeeting>((res) => {
        sockets.websocket.emit("join-scheduled-meeting", joinData, (m: IMeeting) => res(m));
      });
    });
  }

  function joinChannelMeeting({ channelId, camera }: { channelId: number; camera?: MediaStream }) {
    incomingMeeting.value = null;
    return connectMeeting({ camera }, async (data) => {
      const joinData = { ...data, channelId };
      return await new Promise<IMeeting>((res) => {
        sockets.websocket.emit("join-channel-meeting", joinData, (m: IMeeting) => res(m));
      });
    });
  }

  function attendeeJoined({ attendee }: { attendee: IMeetingAttendee }) {
    streaming.value?.connect(attendee.remoteId);
  }

  function attendeeLeft({ remoteId }: { remoteId: string }) {
    streaming.value?.disconnect(remoteId);
    attendees.value = attendees.value.filter((a) => a.remoteId !== remoteId);
    if (activeSpeakerId.value === remoteId) activeSpeakerId.value = null;
    if (pinnedSpeakerId.value === remoteId) pinnedSpeakerId.value = null;
    syncDetectorSources();
  }

  function onCameraToggled({ remoteId, enabled }: { remoteId: string; enabled: boolean }) {
    if (remoteId === localRemoteId.value) {
      isCameraOn.value = enabled;
      const track = mycamera.value?.getVideoTracks()[0];
      if (!track) return;
      track.enabled = enabled;
    } else {
      const attendee = attendees.value.find((a) => a.remoteId === remoteId);
      const track = attendee?.camera.getVideoTracks()[0];
      if (!track) return;
      track.enabled = enabled;
      attendee.isCameraOn = enabled;
    }
  }

  function onMicrophoneToggled({ remoteId, enabled }: { remoteId: string; enabled: boolean }) {
    if (remoteId === localRemoteId.value) {
      isMicrophoneOn.value = enabled;
      const track = mycamera.value?.getAudioTracks()[0];
      if (!track) return;
      track.enabled = enabled;
    } else {
      const attendee = attendees.value.find((a) => a.remoteId === remoteId);
      const track = attendee?.camera.getAudioTracks()[0];
      if (!track) return;
      track.enabled = enabled;
      attendee.isMicrophoneOn = enabled;
    }
  }

  function onIncomingMeeting({ meeting }: { meeting: IMeeting }) {
    incomingMeeting.value = meeting;
  }

  function onCurrentMeetingEnded({ meetingId }: { meetingId: number }) {
    if (currentMeeting.value?.id === meetingId) {
      closeMeeting();
    }
  }

  function onMeetingEnded({ meetingId }: { meetingId: number }) {
    if (incomingMeeting.value?.id === meetingId) incomingMeeting.value = null;
  }

  async function acceptIncomingMeeting() {
    if (!incomingMeeting.value) return;
    await joinMeeting({ meetingId: incomingMeeting.value.id });
    incomingMeeting.value = null;
  }

  function rejectIncomingMeeting() {
    incomingMeeting.value = null;
  }

  async function leaveMeeting() {
    sockets.websocket.emit("leave-meeting", {
      meetingId: currentMeeting.value?.id,
      remoteId: streaming.value?.localId,
    });
    closeMeeting();
  }

  function endMeeting() {
    if (currentMeetingChannelType.value === "meeting") {
      // Meeting channels are persistent; "end" behaves like leave.
      leaveMeeting();
      return;
    }
    sockets.websocket.emit("end-meeting", { meetingId: currentMeeting.value?.id });
    closeMeeting();
  }

  function closeMeeting() {
    streaming.value?.close();
    removeCameras();
    currentMeeting.value = null;
    currentMeetingChannelType.value = null;
    teardownDetector();
  }

  function removeCameras() {
    mycamera.value?.getTracks().forEach((track) => track.stop());
    mycamera.value = null;
    attendees.value = [];
  }

  function stopCamera() {
    if (!mycamera.value) return;
    const videoTrack = mycamera.value.getVideoTracks()[0];
    if (!videoTrack) return;
    isCameraOn.value = !isCameraOn.value;
    videoTrack.enabled = isCameraOn.value;

    sockets.websocket.emit("camera-toggled", {
      remoteId: localRemoteId.value,
      enabled: isCameraOn.value,
    });
  }

  function stopMicrophone() {
    if (!mycamera.value) return;
    const audioTrack = mycamera.value.getAudioTracks()[0];
    if (!audioTrack) return;

    isMicrophoneOn.value = !isMicrophoneOn.value;
    audioTrack.enabled = isMicrophoneOn.value;

    sockets.websocket.emit("microphone-toggled", {
      remoteId: localRemoteId.value,
      enabled: isMicrophoneOn.value,
    });
  }

  // Keep detector inputs synced when local/remote streams change (camera reacquired, etc).
  watch(
    sources,
    () => {
      if (!detector.value) return;
      detector.value.setSources(sources.value);
      void detector.value.resume();
    },
    { deep: false },
  );

  return {
    incomingMeeting,
    currentMeeting,
    currentMeetingChannelType,
    subscribeMeetings,
    mycamera,
    attendees,
    isCameraOn,
    isMicrophoneOn,
    layoutMode,
    peersDock,
    topDockMax,
    setLayoutMode,
    setPeersDock,
    setTopDockMax,
    speakingIds,
    activeSpeakerId,
    pinnedSpeakerId,
    pinSpeaker,
    unpinSpeaker,
    togglePinSpeaker,
    joinMeeting,
    joinScheduledMeeting,
    joinChannelMeeting,
    acceptIncomingMeeting,
    rejectIncomingMeeting,
    leaveMeeting,
    endMeeting,
    stopCamera,
    stopMicrophone,
  };
});
