import type { MeetingGridLayoutView, MeetingSpeakerLayoutView } from "@/lib/meetings";
import type { MeetingParticipant } from "@/lib/meetings/types";
import { storyUsers } from "./users";

function participant(
  id: string,
  user: (typeof storyUsers)[keyof typeof storyUsers],
  overrides: Partial<MeetingParticipant> = {},
): MeetingParticipant {
  return {
    id,
    stream: null,
    user,
    isLocal: false,
    isCameraOn: true,
    isMicrophoneOn: true,
    isScreenSharing: false,
    streamEpoch: 0,
    ...overrides,
  };
}

export const storyMeetingParticipants: MeetingParticipant[] = [
  participant("local", storyUsers.sean, { isLocal: true }),
  participant("p2", storyUsers.daiana),
  participant("p3", storyUsers.jean, { isCameraOn: false }),
];

export const storyMeetingGridLayout: MeetingGridLayoutView = {
  participants: storyMeetingParticipants,
  speakingIds: new Set(["p2"]),
  pinnedId: null,
  audioOutputDeviceId: null,
};

export const storyMeetingSpeakerLayout: MeetingSpeakerLayoutView = {
  featured: storyMeetingParticipants[1]!,
  topDockPeers: [storyMeetingParticipants[0]!],
  rightDockPeers: [storyMeetingParticipants[2]!],
  speakingIds: new Set(["p2"]),
  pinnedId: null,
  audioOutputDeviceId: null,
};
