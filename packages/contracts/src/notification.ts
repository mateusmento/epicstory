import type { IChannel, IMessage, IReply } from "./channel-message";
import type { IUser } from "./user";

export type MentionNotificationPayload = {
  channel: IChannel;
  message: IMessage;
  sender: IUser;
  reply?: IReply;
  mentionedUsers?: IUser[];
};

export type ReplyNotificationPayload = {
  reply: IReply;
  message: IMessage;
  channel: IChannel;
  sender: IUser;
};

export type DirectMessageNotificationPayload = {
  message: IMessage;
  channel: IChannel;
  sender: IUser;
};

export type IssueDueDateNotificationPayload = {
  title: string;
  description: string;
  issueId: number;
  /** Stable external id, e.g. `EPIC-42`. Omitted on older notifications. */
  issueKey?: string;
  projectId: number;
  workspaceId: number;
  dueDate: string;
};

export type IssueAssignedNotificationPayload = {
  title: string;
  description: string;
  issueId: number;
  /** Stable external id, e.g. `EPIC-42`. Omitted on older notifications. */
  issueKey?: string;
  projectId: number;
  issuer: IUser;
};

export type CalendarMeetingReminderNotificationPayload = {
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
};

export type CalendarEventReminderNotificationPayload = {
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
};

export type MessageReactionNotificationPayload = {
  messageId: number;
  channelId: number;
  emoji: string;
  reactorUserId: number;
  channelName?: string;
  reactor?: IUser;
  messageExcerpt?: string;
};

export type ReplyReactionNotificationPayload = {
  replyId: number;
  channelId: number;
  emoji: string;
  reactorUserId: number;
  channelName?: string;
  reactor?: IUser;
  messageExcerpt?: string;
};

export type SprintCompletedNotificationPayload = {
  sprintId: number;
  sprintName: string;
  teamId: number;
  workspaceId: number;
  completedBy: IUser;
  itemCount: number;
  completedItemCount: number;
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
  | ReplyReactionNotificationPayload
  | SprintCompletedNotificationPayload;

export type NotificationWithPayload =
  | { type: "mention"; payload: MentionNotificationPayload }
  | { type: "reply"; payload: ReplyNotificationPayload }
  | { type: "direct_message"; payload: DirectMessageNotificationPayload }
  | { type: "issue_due_date"; payload: IssueDueDateNotificationPayload }
  | { type: "issue_assigned"; payload: IssueAssignedNotificationPayload }
  | {
      type: "calendar_meeting_reminder";
      payload: CalendarMeetingReminderNotificationPayload;
    }
  | {
      type: "calendar_event_reminder";
      payload: CalendarEventReminderNotificationPayload;
    }
  | { type: "message_reaction"; payload: MessageReactionNotificationPayload }
  | { type: "reply_reaction"; payload: ReplyReactionNotificationPayload }
  | { type: "sprint_completed"; payload: SprintCompletedNotificationPayload };

export type NotificationBase = {
  id: string;
  userId: number;
  createdAt: string;
  seen: boolean;
};

/** switch on notification.type narrows notification.payload */
export type INotification = NotificationBase & NotificationWithPayload;

export type NotificationType = NotificationWithPayload["type"];

export type NotificationPayloadFor<T extends NotificationType> = Extract<
  NotificationWithPayload,
  { type: T }
>["payload"];
