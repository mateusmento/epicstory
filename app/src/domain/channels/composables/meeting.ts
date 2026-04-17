import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import type { User } from "@/domain/auth";
import { ChannelApi } from "@/domain/channels/services";
import { MeetingApi } from "@/domain/channels/services/meeting.api";
import type { PeerSession } from "@/domain/channels/utils/media-streaming";
import { createPeersSession, untilOpen } from "@/domain/channels/utils/media-streaming";
import {
  replaceOutgoingTracksForPeers,
  replaceOutgoingVideoTrackForPeers,
} from "@/domain/channels/utils/meeting-peer-replace-tracks";
import { compositeLocalMeetingMedia } from "@/domain/channels/utils/meeting-screen-share";
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
import { useMeetingMediaDevicesStore } from "./meeting-media-devices";
import { useMeetingSocket } from "./meeting-socket";

export type MeetingStreamingAttendee = {
  remoteId: string;
  camera: MediaStream;
  user: User;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  /** From server + socket; used so remotes use presentation aspect (replaceTrack hides displaySurface). */
  isScreenSharing: boolean;
  /** Bumped when remote {@link MediaStream} tracks change so tiles refresh (Vue does not deep-watch streams). */
  streamEpoch: number;
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
  const session = shallowRef<PeerSession | null>();

  const localRemoteId = ref<string | null>(null);
  const mycamera = ref<MediaStream | null>(null);
  /** Outbound screen uses {@link replaceOutgoingVideoTrackForPeers}; kept off {@link mycamera} so new PeerJS calls stay single-video. */
  const localScreenShareTrack = ref<MediaStreamTrack | null>(null);
  /** Bumps when local composite media (e.g. screen share) changes so tiles remount. */
  const localMediaEpoch = ref(0);
  const attendees = ref<MeetingStreamingAttendee[]>([]);

  const isCameraOn = ref(true);
  const isMicrophoneOn = ref(true);
  const isScreenSharing = ref(false);

  // --- Layout mode (meeting grid) ---
  const layoutMode = ref<"speaker" | "grid">("speaker");
  const peersDock = ref<"both" | "top" | "right">("both");
  const topDockMax = ref<number>(4);

  // --- Grid paging (large meetings) ---
  const gridPage = ref<number>(1);

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
    src.push({
      id: "local",
      stream: compositeLocalMeetingMedia(mycamera.value, localScreenShareTrack.value),
    });
    for (const a of attendees.value) src.push({ id: a.remoteId, stream: a.camera });
    return src;
  });

  function syncOutboundScreenVideoToAllPeers() {
    if (!isScreenSharing.value || !session.value || !localScreenShareTrack.value) return;
    const remoteIds = attendees.value.map((a) => a.remoteId);
    if (remoteIds.length === 0) return;
    replaceOutgoingVideoTrackForPeers(
      localScreenShareTrack.value,
      (id) => session.value?.getConnection(id),
      remoteIds,
    );
  }

  function setLayoutMode(mode: "speaker" | "grid") {
    layoutMode.value = mode;
    if (mode === "grid") gridPage.value = 1;
  }

  function setPeersDock(dock: "both" | "top" | "right") {
    peersDock.value = dock;
  }

  function setTopDockMax(n: number) {
    topDockMax.value = Math.max(0, Math.floor(n));
  }

  function setGridPage(page: number) {
    gridPage.value = Math.max(1, Math.floor(page));
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
    const mediaDevices = useMeetingMediaDevicesStore();
    await mediaDevices.refreshDevices();
    try {
      return await navigator.mediaDevices.getUserMedia(mediaDevices.streamConstraints());
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.log("Joining meeting without camera permission", error);
        return;
      }
    }
  }

  /**
   * Re-acquire camera/mic from the selected devices, swap tracks on the existing local
   * {@link MediaStream} (same object PeerJS holds), and {@link RTCRtpSender.replaceTrack}
   * so remotes keep working.
   */
  async function applySelectedInputDevices() {
    if (!mycamera.value) return;
    const mediaDeviceStore = useMeetingMediaDevicesStore();
    let incoming: MediaStream;
    try {
      incoming = await navigator.mediaDevices.getUserMedia(mediaDeviceStore.streamConstraints());
    } catch (e) {
      console.warn("Could not acquire media for selected devices", e);
      return;
    }

    const stream = mycamera.value;
    const newVideo = incoming.getVideoTracks()[0];
    const newAudio = incoming.getAudioTracks()[0];

    const remoteIds = attendees.value.map((a) => a.remoteId);
    if (session.value && remoteIds.length > 0) {
      replaceOutgoingTracksForPeers(newVideo, newAudio, (id) => session.value?.getConnection(id), remoteIds);
    }

    for (const t of [...stream.getVideoTracks()]) {
      stream.removeTrack(t);
      t.stop();
    }
    for (const t of [...stream.getAudioTracks()]) {
      stream.removeTrack(t);
      t.stop();
    }

    if (newVideo) {
      stream.addTrack(newVideo);
      newVideo.enabled = isCameraOn.value;
    }
    if (newAudio) {
      stream.addTrack(newAudio);
      newAudio.enabled = isMicrophoneOn.value;
    }

    incoming.getTracks().forEach((t) => {
      if (!stream.getTracks().includes(t)) t.stop();
    });

    localMediaEpoch.value++;
    syncDetectorSources();
  }

  async function startScreenShare() {
    if (!mycamera.value || !session.value || isScreenSharing.value) return;

    let screenStream: MediaStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch {
      return;
    }

    const screenVideo = screenStream.getVideoTracks()[0];
    if (!screenVideo) {
      screenStream.getTracks().forEach((t) => t.stop());
      return;
    }

    localScreenShareTrack.value = screenVideo;
    isScreenSharing.value = true;

    const remoteIds = attendees.value.map((a) => a.remoteId);
    if (session.value && remoteIds.length > 0) {
      replaceOutgoingVideoTrackForPeers(screenVideo, (id) => session.value?.getConnection(id), remoteIds);
    }

    screenVideo.addEventListener("ended", () => {
      stopScreenShare();
    });

    pinSpeaker("local");
    setLayoutMode("speaker");
    localMediaEpoch.value++;
    emitScreenShareToggled(true);
    syncDetectorSources();
  }

  function stopScreenShare() {
    const screenTrack = localScreenShareTrack.value;
    if (!mycamera.value || !screenTrack) {
      localScreenShareTrack.value = null;
      if (isScreenSharing.value) emitScreenShareToggled(false);
      isScreenSharing.value = false;
      return;
    }

    const cameraVideo = mycamera.value.getVideoTracks()[0];
    const remoteIds = attendees.value.map((a) => a.remoteId);
    if (session.value && remoteIds.length > 0 && cameraVideo) {
      replaceOutgoingVideoTrackForPeers(cameraVideo, (id) => session.value?.getConnection(id), remoteIds);
    }

    localScreenShareTrack.value = null;
    isScreenSharing.value = false;
    screenTrack.stop();
    localMediaEpoch.value++;
    emitScreenShareToggled(false);
    syncDetectorSources();
  }

  function createAttendee(
    remoteId: string,
    camera: MediaStream,
    attendee: IMeetingAttendee,
  ): MeetingStreamingAttendee {
    return {
      remoteId,
      camera,
      user: attendee.user,
      isCameraOn: attendee.isCameraOn,
      isMicrophoneOn: attendee.isMicrophoneOn,
      isScreenSharing: attendee.isScreenSharing ?? false,
      streamEpoch: 0,
    };
  }

  function emitScreenShareToggled(enabled: boolean) {
    const meetingId = currentMeeting.value?.id;
    const remoteId = localRemoteId.value;
    if (meetingId == null || remoteId == null) return;
    sockets.websocket.emit("screen-share-toggled", { meetingId, remoteId, enabled });
  }

  function onScreenShareToggled({ remoteId, enabled }: { remoteId: string; enabled: boolean }) {
    if (remoteId === localRemoteId.value) {
      if (isScreenSharing.value !== enabled) {
        isScreenSharing.value = enabled;
        if (!enabled) {
          localScreenShareTrack.value?.stop();
          localScreenShareTrack.value = null;
        }
        localMediaEpoch.value++;
      }
      return;
    }
    attendees.value = attendees.value.map((a) =>
      a.remoteId === remoteId ? { ...a, isScreenSharing: enabled, streamEpoch: a.streamEpoch + 1 } : a,
    );
  }

  function bumpAttendeeStreamEpoch(remoteId: string) {
    attendees.value = attendees.value.map((a) =>
      a.remoteId === remoteId ? { ...a, streamEpoch: (a.streamEpoch ?? 0) + 1 } : a,
    );
  }

  function attachRemoteStreamTrackListeners(remoteId: string, stream: MediaStream) {
    const bump = () => bumpAttendeeStreamEpoch(remoteId);
    stream.addEventListener("addtrack", bump);
    stream.addEventListener("removetrack", bump);
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

    const data = {
      remoteId: localRemoteId.value,
      isCameraOn: isCameraOn.value,
      isMicrophoneOn: isMicrophoneOn.value,
    };

    const meeting = await meetingFactory(data);

    session.value = createPeersSession({
      rtc,
      media: camera,
      async onIncomingStream(remoteId, peerStream) {
        const [apiAttendee] = await meetingApi.findAttendees({ remoteId, meetingId: meeting.id });
        const idx = attendees.value.findIndex((a) => a.remoteId === remoteId);
        if (idx >= 0) {
          const prev = attendees.value[idx];
          attendees.value.splice(idx, 1, {
            ...prev,
            camera: peerStream,
            streamEpoch: (prev.streamEpoch ?? 0) + 1,
            isScreenSharing: apiAttendee.isScreenSharing ?? false,
          });
        } else {
          attendees.value.push(createAttendee(remoteId, peerStream, apiAttendee));
        }
        attachRemoteStreamTrackListeners(remoteId, peerStream);
        syncDetectorSources();
      },
      onMediaSessionReady() {
        syncOutboundScreenVideoToAllPeers();
      },
    });

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
    sockets.websocket.off("screen-share-toggled", onScreenShareToggled);

    sockets.websocket.on("attendee-left", attendeeLeft);
    sockets.websocket.on("attendee-joined", attendeeJoined);
    sockets.websocket.on("camera-toggled", onCameraToggled);
    sockets.websocket.on("microphone-toggled", onMicrophoneToggled);
    sockets.websocket.on("screen-share-toggled", onScreenShareToggled);
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

  async function attendeeJoined({ attendee }: { attendee: IMeetingAttendee }) {
    await session.value?.connect(attendee.remoteId);
  }

  function attendeeLeft({ remoteId }: { remoteId: string }) {
    session.value?.disconnect(remoteId);
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
      remoteId: session.value?.localId,
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
    session.value?.close();
    removeCameras();
    currentMeeting.value = null;
    currentMeetingChannelType.value = null;
    teardownDetector();
  }

  function removeCameras() {
    if (isScreenSharing.value || localScreenShareTrack.value) {
      emitScreenShareToggled(false);
    }
    localScreenShareTrack.value?.stop();
    localScreenShareTrack.value = null;
    localMediaEpoch.value = 0;
    isScreenSharing.value = false;
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
    localScreenShareTrack,
    localMediaEpoch,
    attendees,
    isCameraOn,
    isMicrophoneOn,
    isScreenSharing,
    layoutMode,
    peersDock,
    topDockMax,
    setLayoutMode,
    setPeersDock,
    setTopDockMax,
    gridPage,
    setGridPage,
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
    startScreenShare,
    stopScreenShare,
    applySelectedInputDevices,
  };
});
