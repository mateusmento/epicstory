import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import type { User } from "@/domain/auth";
import { MeetingApi } from "@/domain/channels/services/meeting.api";
import {
  createMediaStreaming,
  untilOpen,
  type MediaStreaming,
} from "@/domain/channels/utils/media-streaming";
import { useWorkspace } from "@/domain/workspace";
import Peer from "peerjs";
import { defineStore, storeToRefs } from "pinia";
import { ref, shallowRef } from "vue";
import type { IChannel, IMeeting } from "../types";
import { useChannel } from "./channel";
import { config } from "@/config";

export type MeetingStreamingAttendee = {
  remoteId: string;
  camera: MediaStream;
  user: User;
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
  const { openChannel } = useChannel();

  const currentMeeting = ref<IMeeting | null>();
  const streaming = shallowRef<MediaStreaming | null>();

  const mycamera = ref<MediaStream | null>(null);
  const attendees = ref<MeetingStreamingAttendee[]>([]);

  const isCameraOn = ref(true);
  const isMicrophoneOn = ref(true);

  const meetingApi = useDependency(MeetingApi);

  async function subscribeMeetings() {
    sockets.websocket.emit("subscribe-meetings", {
      workspaceId: workspace.value?.id,
    });
  }

  async function joinMeeting(channel: IChannel) {
    const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    mycamera.value = camera;

    const rtc = await untilOpen(
      new Peer({ host: config.PEERJS_SERVER_HOST, port: config.PEERJS_SERVER_PORT }),
    );

    streaming.value = createMediaStreaming({
      rtc,
      media: camera,
      async mediaAdded(remoteId, camera) {
        const [attendee] = await meetingApi.findAttendees({ remoteId, meetingId: meeting.id });
        attendees.value.push({ remoteId, camera, user: attendee?.user });
      },
    });

    const data = { channelId: channel.id, remoteId: streaming.value.localId };

    const meeting = await new Promise<IMeeting>((res) => {
      sockets.websocket.emit("join-meeting", data, (meeting: IMeeting) => res(meeting));
    });

    subscribeMeetings();

    sockets.websocket.off("attendee-left", attendeeLeft);
    sockets.websocket.off("attendee-joined", attendeeJoined);

    sockets.websocket.on("attendee-left", attendeeLeft);
    sockets.websocket.on("attendee-joined", attendeeJoined);
    sockets.websocket.once(`current-meeting-ended`, onMeetingEnded);

    console.log(sockets.websocket.listeners("attendee-joined"));

    openChannel(channel);
    currentMeeting.value = meeting;
  }

  function attendeeJoined({ remoteId }: { remoteId: string }) {
    console.log("attendee joined", streaming.value);
    streaming.value?.connect(remoteId);
  }

  function attendeeLeft({ remoteId }: { remoteId: string }) {
    streaming.value?.disconnect(remoteId);
    attendees.value = attendees.value.filter((a) => a.remoteId !== remoteId);
  }

  function onMeetingEnded({ meetingId }: { meetingId: number }) {
    console.log(`meeting:${meetingId}:ended`);
    closeMeeting();
  }

  async function leaveMeeting() {
    sockets.websocket.emit("leave-meeting", {
      meetingId: currentMeeting.value?.id,
      remoteId: streaming.value?.localId,
    });
    closeMeeting();
  }

  function endMeeting() {
    sockets.websocket.emit("end-meeting", { meetingId: currentMeeting.value?.id });
    streaming.value?.close();
  }

  function closeMeeting() {
    streaming.value?.close();
    removeCameras();
    currentMeeting.value = null;
  }

  function removeCameras() {
    mycamera.value?.getTracks().forEach((track) => track.stop());
    mycamera.value = null;
    attendees.value = [];
  }

  function stopCamera() {
    if (!mycamera.value) return;
    if (isCameraOn.value) {
      mycamera.value.getVideoTracks()[0].stop();
      isCameraOn.value = false;
    } else {
      navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    }
  }

  function stopMicrophone() {
    if (!mycamera.value) return;
    mycamera.value.getAudioTracks()[0].stop();
    isMicrophoneOn.value = false;
  }

  return {
    currentMeeting,
    mycamera,
    attendees,
    isCameraOn,
    isMicrophoneOn,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    stopCamera,
    stopMicrophone,
  };
});
