import type { IMessage, IReply } from "./channel-message";

export type IssueFeedActivityType =
  | "issue_created"
  | "comment_created"
  | "title_changed"
  | "description_changed"
  | "status_changed"
  | "priority_changed"
  | "due_date_changed"
  | "assignees_changed"
  | "labels_changed"
  | "parent_changed"
  | "attachment_added";

export type IIssueFeedItem = {
  activityId: number;
  issueId: number;
  type: IssueFeedActivityType;
  actorId: number | null;
  actor?: { id: number; name: string; picture: string | null } | null;
  createdAt: string;
  messageId: number | null;
  attachmentId: number | null;
  payload: Record<string, unknown> | null;
  message: IMessage | null;
  replyPreviews: IReply[];
  repliesTotal?: number;
  hasMoreOlder?: boolean;
};

export type IIssueFeed = {
  commentChannelId: number | null;
  items: IIssueFeedItem[];
};
