import type { IMeeting } from "./channel-message";
import type {
  ChannelTypingPulseBody,
  ChannelTypingStopBody,
  IncomingChannelActivityEvent,
  IncomingMessageReactionEvent,
  IncomingReplyEvent,
  IncomingReplyReactionEvent,
  MessageDeletedEvent,
  MessagePollUpdatedEvent,
  MessageUpdatedEvent,
  ReplyDeletedEvent,
  ReplyUpdatedEvent,
  SubscribeMessagesBody,
  UserTypingEvent,
  UserTypingStoppedEvent,
} from "./channel-socket-events";
import type { IIssue } from "./issue";
import type { IncomingMeetingEvent, MeetingEndedEvent } from "./meeting-live";
import type {
  AttendeeJoinedEvent,
  AttendeeLeftEvent,
  CurrentMeetingEndedEvent,
  EndMeetingBody,
  IncomingAttendeeEvent,
  JoinChannelMeetingBody,
  JoinMeetingBody,
  JoinScheduledMeetingBody,
  LeaveMeetingBody,
  LeavingAttendeeEvent,
  MeetingHeartbeatBody,
  MeetingMediaToggleBody,
  MeetingMediaToggledChannelEvent,
  MeetingMediaToggledEvent,
  SubscribeMeetingsBody,
} from "./meeting-socket-events";
import type { INotification } from "./notification";
import type {
  SubscribeWorkspacePresenceBody,
  UnsubscribeWorkspacePresenceBody,
  UserPresenceEvent,
  UserPresenceStoppedEvent,
  WorkspacePresencePulseBody,
  WorkspacePresenceStopBody,
} from "./workspace-socket-events";

/** Wire payload for media toggle events (in-room vs channel meeting room). */
export type MeetingMediaToggledWireEvent =
  | MeetingMediaToggledEvent
  | MeetingMediaToggledChannelEvent;

export type SubscribeNotificationsBody = {
  userId: number;
};

export type UnsubscribeNotificationsBody = {
  userId: number;
};

export type SubscribeProjectBody = {
  projectId: number;
};

export type UnsubscribeProjectBody = {
  projectId: number;
};

export type IssueUpdatedEvent = {
  projectId: number;
  issue: IIssue;
};

/** Client → server Socket.IO events. */
export interface ClientToServerEvents {
  "subscribe-messages": (body: SubscribeMessagesBody) => void;
  "channel-typing-pulse": (body: ChannelTypingPulseBody) => void;
  "channel-typing-stop": (body: ChannelTypingStopBody) => void;

  "subscribe-workspace-presence": (
    body: SubscribeWorkspacePresenceBody,
  ) => void;
  "unsubscribe-workspace-presence": (
    body: UnsubscribeWorkspacePresenceBody,
  ) => void;
  "workspace-presence-pulse": (body: WorkspacePresencePulseBody) => void;
  "workspace-presence-stop": (body: WorkspacePresenceStopBody) => void;

  "subscribe-meetings": (body: SubscribeMeetingsBody) => void;
  "meeting-heartbeat": (body: MeetingHeartbeatBody) => void;
  "join-meeting": (
    body: JoinMeetingBody,
    ack: (meeting: IMeeting) => void,
  ) => void;
  "join-scheduled-meeting": (
    body: JoinScheduledMeetingBody,
    ack: (meeting: IMeeting) => void,
  ) => void;
  "join-channel-meeting": (
    body: JoinChannelMeetingBody,
    ack: (meeting: IMeeting) => void,
  ) => void;
  "leave-meeting": (body: LeaveMeetingBody) => void;
  "end-meeting": (body: EndMeetingBody) => void;
  "camera-toggled": (body: MeetingMediaToggleBody) => void;
  "microphone-toggled": (body: MeetingMediaToggleBody) => void;
  "screen-share-toggled": (body: MeetingMediaToggleBody) => void;

  "subscribe-notifications": (body: SubscribeNotificationsBody) => void;
  "unsubscribe-notifications": (body: UnsubscribeNotificationsBody) => void;

  "subscribe-project": (body: SubscribeProjectBody) => void;
  "unsubscribe-project": (body: UnsubscribeProjectBody) => void;
}

/** Server → client Socket.IO events. */
export interface ServerToClientEvents {
  "incoming-channel-activity": (payload: IncomingChannelActivityEvent) => void;
  "incoming-reply": (payload: IncomingReplyEvent) => void;
  "incoming-message-reaction": (payload: IncomingMessageReactionEvent) => void;
  "incoming-reply-reaction": (payload: IncomingReplyReactionEvent) => void;
  "message-deleted": (payload: MessageDeletedEvent) => void;
  "message-updated": (payload: MessageUpdatedEvent) => void;
  "reply-updated": (payload: ReplyUpdatedEvent) => void;
  "reply-deleted": (payload: ReplyDeletedEvent) => void;
  "message-poll-updated": (payload: MessagePollUpdatedEvent) => void;
  "user-typing": (payload: UserTypingEvent) => void;
  "user-typing-stopped": (payload: UserTypingStoppedEvent) => void;

  "user-presence": (payload: UserPresenceEvent) => void;
  "user-presence-stopped": (payload: UserPresenceStoppedEvent) => void;

  "incoming-meeting": (payload: IncomingMeetingEvent) => void;
  "meeting-ended": (payload: MeetingEndedEvent) => void;
  "attendee-joined": (payload: AttendeeJoinedEvent) => void;
  "attendee-left": (payload: AttendeeLeftEvent) => void;
  "incoming-attendee": (payload: IncomingAttendeeEvent) => void;
  "leaving-attendee": (payload: LeavingAttendeeEvent) => void;
  "camera-toggled": (payload: MeetingMediaToggledWireEvent) => void;
  "microphone-toggled": (payload: MeetingMediaToggledWireEvent) => void;
  "screen-share-toggled": (payload: MeetingMediaToggledWireEvent) => void;
  "current-meeting-ended": (payload: CurrentMeetingEndedEvent) => void;

  "incoming-notification": (payload: INotification) => void;

  "issue-updated": (payload: IssueUpdatedEvent) => void;
}
