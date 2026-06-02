import type { IUser as IUser } from "@epicstory/contracts";
import type { IChannel, IMessage, IReply } from "@epicstory/contracts";

export type MentionNotificationPayload = {
  type: "mention";
  channel: IChannel;
  message: IMessage;
  sender: IUser;
  reply?: IReply;
};

export type ReplyNotificationPayload = {
  type: "reply";
  reply: IReply;
  message: IMessage;
  channel: IChannel;
  sender: IUser;
};

export type DirectMessageNotificationPayload = {
  type: "direct_message";
  message: IMessage;
  channel: IChannel;
  sender: IUser;
};

export type IssueDueDateNotificationPayload = {
  type: "issue_due_date";
  title: string;
  description: string;
  issueId: number;
  issueKey?: string;
  projectId: number;
  workspaceId: number;
  dueDate: string;
};

export type IssueAssignedNotificationPayload = {
  type: "issue_assigned";
  title: string;
  description: string;
  issueId: number;
  issueKey?: string;
  projectId: number;
  issuer: IUser;
};

export type CalendarMeetingReminderNotificationPayload = {
  type: "calendar_meeting_reminder";
  calendarEventId: string;
  occurrenceAt: string;
  meetingId: number;
  channelId?: number | null;
  title: string;
  notifyMinutesBefore?: number;
  description?: string;
  calendarEventType?: "event" | "meeting";
  startsAt?: string;
  endsAt?: string;
  isPublic?: boolean;
  notifyEnabled?: boolean;
  eventPayload?: Record<string, unknown>;
};

export type CalendarEventReminderNotificationPayload = {
  type: "calendar_event_reminder";
  calendarEventId: string;
  occurrenceAt: string;
  channelId?: number | null;
  title: string;
  notifyMinutesBefore?: number;
  description?: string;
  calendarEventType?: "event" | "meeting";
  startsAt?: string;
  endsAt?: string;
  isPublic?: boolean;
  notifyEnabled?: boolean;
  eventPayload?: Record<string, unknown>;
};

export type MessageReactionNotificationPayload = {
  type?: "message_reaction";
  messageId: number;
  channelId: number;
  emoji: string;
  reactorUserId: number;
  channelName?: string;
  reactor?: IUser;
  messageExcerpt?: string;
};

export type ReplyReactionNotificationPayload = {
  type?: "reply_reaction";
  replyId: number;
  channelId: number;
  emoji: string;
  reactorUserId: number;
  channelName?: string;
  reactor?: IUser;
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
