import type { IChannel, IMessage, IReply } from "@/domain/channels";
import type { User } from "@/domain/auth";
import type { Issue } from "@/domain/issues/types/issue.type";

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
  issue: Issue;
  issuer: User;
};

export type CalendarMeetingReminderNotificationPayload = {
  type?: "calendar_meeting_reminder";
  calendarEventId: string;
  occurrenceAt: string;
  meetingId: number;
  channelId?: number | null;
  title: string;
};

export type CalendarEventReminderNotificationPayload = {
  type?: "calendar_event_reminder";
  calendarEventId: string;
  occurrenceAt: string;
  channelId?: number | null;
  title: string;
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
