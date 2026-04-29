import type { User } from "@/domain/auth";
import type { IChannel, IMessage, IReply } from "@/domain/channels";

export type MentionNotificationPayload = {
  type: "mention";
  channel: IChannel;
  message: IMessage;
  sender: User;
  reply?: IReply;
};

export type ReplyNotificationPayload = {
  type: "reply";
  reply: IReply;
  message: IMessage;
  channel: IChannel;
  sender: User;
};

export type DirectMessageNotificationPayload = {
  type: "direct_message";
  message: IMessage;
  channel: IChannel;
  sender: User;
};

export type IssueDueDateNotificationPayload = {
  type: "issue_due_date";
  title: string;
  description: string;
  issueId: number;
  projectId: number;
};

export type IssueAssignedNotificationPayload = {
  type: "issue_assigned";
  title: string;
  description: string;
  issueId: number;
  projectId: number;
  issuer: User;
};

export type CalendarMeetingReminderNotificationPayload = {
  type: "calendar_meeting_reminder";
  calendarEventId: string;
  occurrenceAt: string;
  meetingId: number;
  channelId?: number | null;
  title: string;
  /** Minutes before start this reminder was scheduled for (from scheduled job / event). */
  notifyMinutesBefore?: number;
  description?: string;
  calendarEventType?: "event" | "meeting";
  startsAt?: string;
  endsAt?: string;
  isPublic?: boolean;
  notifyEnabled?: boolean;
  /** Calendar row `payload` JSON (e.g. meeting channelId). */
  eventPayload?: Record<string, unknown>;
};

export type CalendarEventReminderNotificationPayload = {
  type: "calendar_event_reminder";
  calendarEventId: string;
  occurrenceAt: string;
  channelId?: number | null;
  title: string;
  /** Minutes before start this reminder was scheduled for (from scheduled job / event). */
  notifyMinutesBefore?: number;
  description?: string;
  calendarEventType?: "event" | "meeting";
  startsAt?: string;
  endsAt?: string;
  isPublic?: boolean;
  notifyEnabled?: boolean;
  eventPayload?: Record<string, unknown>;
};

/** Payload for inbox / websocket when someone reacts to your channel message. */
export type MessageReactionNotificationPayload = {
  type?: "message_reaction";
  messageId: number;
  channelId: number;
  emoji: string;
  reactorUserId: number;
  channelName?: string;
  reactor?: User;
  /** Resolved plain excerpt (mentions expanded, truncated). */
  messageExcerpt?: string;
};

/** Payload when someone reacts to your thread reply. */
export type ReplyReactionNotificationPayload = {
  type?: "reply_reaction";
  replyId: number;
  channelId: number;
  emoji: string;
  reactorUserId: number;
  channelName?: string;
  reactor?: User;
  messageExcerpt?: string;
};

export type NotificationPayload =
  | MentionNotificationPayload
  | ReplyNotificationPayload
  | DirectMessageNotificationPayload
  | IssueDueDateNotificationPayload
  | IssueAssignedNotificationPayload
  | CalendarMeetingReminderNotificationPayload
  | CalendarEventReminderNotificationPayload
  | MessageReactionNotificationPayload
  | ReplyReactionNotificationPayload;

export type NotificationWithPayload =
  | {
      type: "mention";
      payload: MentionNotificationPayload;
    }
  | {
      type: "reply";
      payload: ReplyNotificationPayload;
    }
  | {
      type: "direct_message";
      payload: DirectMessageNotificationPayload;
    }
  | {
      type: "issue_due_date";
      payload: IssueDueDateNotificationPayload;
    }
  | {
      type: "issue_assigned";
      payload: IssueAssignedNotificationPayload;
    }
  | {
      type: "calendar_meeting_reminder";
      payload: CalendarMeetingReminderNotificationPayload;
    }
  | {
      type: "calendar_event_reminder";
      payload: CalendarEventReminderNotificationPayload;
    }
  | {
      type: "message_reaction";
      payload: MessageReactionNotificationPayload;
    }
  | {
      type: "reply_reaction";
      payload: ReplyReactionNotificationPayload;
    };

export type Notification = NotificationWithPayload & {
  id: string;
  type: string;
  userId: number;
  payload: NotificationPayload;
  createdAt: string;
  seen: boolean;
};
