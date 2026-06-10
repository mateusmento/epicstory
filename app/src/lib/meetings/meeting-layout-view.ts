import type { MeetingParticipant } from "./types";

/** Shared chrome for grid + speaker layouts */
export type MeetingLayoutChrome = {
  speakingIds: ReadonlySet<string>;
  pinnedId: string | null;
  audioOutputDeviceId?: string | null;
};

export type MeetingGridLayoutView = MeetingLayoutChrome & {
  participants: MeetingParticipant[];
};

export type MeetingSpeakerLayoutView = MeetingLayoutChrome & {
  featured: MeetingParticipant;
  topDockPeers: MeetingParticipant[];
  rightDockPeers: MeetingParticipant[];
};
