import type { User } from "@/domain/auth";
import type { IChannel, IMessage, IReply } from "@/domain/channels";

export type MentionNotificationPayload = {
  type: "mention";
  channel: IChannel;
  message: string;
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
  type?: "calendar_meeting_reminder";
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
  type?: "calendar_event_reminder";
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

export type NotificationPayload =
  | MentionNotificationPayload
  | ReplyNotificationPayload
  | DirectMessageNotificationPayload
  | IssueDueDateNotificationPayload
  | IssueAssignedNotificationPayload
  | CalendarMeetingReminderNotificationPayload
  | CalendarEventReminderNotificationPayload;

export type Notification = {
  id: string;
  type: string;
  userId: number;
  payload: NotificationPayload;
  createdAt: string;
  seen: boolean;
};
