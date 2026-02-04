import type { IChannel, IMessage, IReply } from "@/domain/channels";
import type { User } from "@/domain/auth";
import type { Issue } from "@/domain/issues/types/issue.type";

export type MentionNotificationPayload = {
  type: "mention";
  channel: IChannel;
  message: string;
  sender: User;
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

export type NotificationPayload =
  | MentionNotificationPayload
  | ReplyNotificationPayload
  | DirectMessageNotificationPayload
  | IssueDueDateNotificationPayload
  | IssueAssignedNotificationPayload;

export type Notification = {
  id: string;
  type: string;
  userId: number;
  payload: NotificationPayload;
  createdAt: string;
  seen: boolean;
};
