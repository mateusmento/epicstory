export type NotificationSender = {
  id: number;
  name: string;
  picture?: string;
};

export type MentionNotificationPayload = {
  type: "mention";
  channelName: string;
  channelId?: number;
  message: string;
  sender: NotificationSender;
};

export type ReplyNotificationPayload = {
  type: "reply";
  channelName: string;
  channelId?: number;
  message: string;
  sender: NotificationSender;
};

export type IssueDueDateNotificationPayload = {
  type: "issue_due_date";
  title: string;
  description: string;
  issueId: number;
};

export type NotificationPayload =
  | MentionNotificationPayload
  | ReplyNotificationPayload
  | IssueDueDateNotificationPayload;

export type Notification = {
  id: string;
  type: string;
  userId: number;
  payload: NotificationPayload;
  createdAt: string;
  seen: boolean;
};
