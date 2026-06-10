import type { IMeeting, IMeetingAttendee } from "./channel-message";

export type SubscribeMeetingsBody = {
  workspaceId: number;
};

export type MeetingHeartbeatBody = {
  meetingId?: number;
};

/** Shared join payload fields (PeerJS id + initial media flags). */
export type JoinMeetingMediaBody = {
  remoteId: string;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
};

export type JoinMeetingBody = JoinMeetingMediaBody & {
  meetingId: number;
};

export type JoinScheduledMeetingBody = JoinMeetingMediaBody & {
  calendarEventId: string;
  /** ISO string from client; API parses with `new Date(occurrenceAt)`. */
  occurrenceAt: string;
};

export type JoinChannelMeetingBody = JoinMeetingMediaBody & {
  channelId: number;
};

export type MeetingMediaToggleBody = {
  meetingId: number;
  remoteId: string;
  enabled: boolean;
};

export type LeaveMeetingBody = {
  meetingId: number;
  remoteId: string;
};

export type EndMeetingBody = {
  meetingId: number;
};

export type AttendeeJoinedEvent = {
  attendee: IMeetingAttendee;
  meeting: IMeeting;
};

export type AttendeeLeftEvent = {
  remoteId: string;
};

/** In-room fan-out (meeting room only). */
export type MeetingMediaToggledEvent = {
  remoteId: string;
  enabled: boolean;
};

/** Channel meeting room fan-out (includes routing ids). */
export type MeetingMediaToggledChannelEvent = MeetingMediaToggledEvent & {
  meetingId: number;
  channelId: number;
};

export type IncomingAttendeeEvent = AttendeeJoinedEvent;

export type LeavingAttendeeEvent = {
  meetingId: number;
  channelId: number;
  remoteId: string;
  userId: number;
};

/** Same wire shape as MeetingEndedEvent; used for in-room end signal. */
export type CurrentMeetingEndedEvent = {
  meetingId: number;
  channelId?: number | null;
};
