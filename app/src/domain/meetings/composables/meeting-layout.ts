import { useAuth } from "@/domain/auth";
import { compositeLocalMeetingMedia, type MeetingParticipant } from "@/lib/meetings";
import { computed } from "vue";
import { useMeeting } from "./meeting";

export type { MeetingParticipant } from "@/lib/meetings";

export function useMeetingLayout() {
  const { user } = useAuth();
  const meeting = useMeeting();

  const participants = computed<MeetingParticipant[]>(() => {
    const list: MeetingParticipant[] = [];

    list.push({
      id: "local",
      stream: compositeLocalMeetingMedia(meeting.mycamera.value, meeting.localScreenShareTrack.value),
      user: user.value ?? null,
      isLocal: true,
      isCameraOn: !!meeting.mycamera.value && !!meeting.isCameraOn.value,
      isMicrophoneOn: !!meeting.mycamera.value && !!meeting.isMicrophoneOn.value,
      isScreenSharing: !!meeting.isScreenSharing.value,
      streamEpoch: meeting.localMediaEpoch.value,
    });

    for (const a of meeting.attendees.value) {
      list.push({
        id: a.remoteId,
        stream: a.camera ?? null,
        user: a.user ?? null,
        isLocal: false,
        isCameraOn: !!a.isCameraOn,
        isMicrophoneOn: !!a.isMicrophoneOn,
        isScreenSharing: !!a.isScreenSharing,
        streamEpoch: a.streamEpoch ?? 0,
      });
    }

    return list;
  });

  function findParticipant(id: string | null | undefined) {
    if (!id) return null;
    return participants.value.find((p) => p.id === id) ?? null;
  }

  const featured = computed<MeetingParticipant>(() => {
    return (
      findParticipant(meeting.pinnedSpeakerId.value) ??
      findParticipant(meeting.activeSpeakerId.value) ??
      participants.value[0] // local as stable fallback
    );
  });

  const others = computed(() => participants.value.filter((p) => p.id !== featured.value.id));

  const topDockPeers = computed(() => {
    if (meeting.layoutMode.value !== "speaker") return [];
    if (meeting.peersDock.value === "right") return [];
    if (meeting.peersDock.value === "top") return others.value;
    return others.value.slice(0, meeting.topDockMax.value);
  });

  const rightDockPeers = computed(() => {
    if (meeting.layoutMode.value !== "speaker") return [];
    if (meeting.peersDock.value === "top") return [];
    if (meeting.peersDock.value === "right") return others.value;
    return others.value.slice(meeting.topDockMax.value);
  });

  return {
    participants,
    featured,
    topDockPeers,
    rightDockPeers,
  };
}
