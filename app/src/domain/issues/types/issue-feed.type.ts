import type { IMessage, IReply } from "@/domain/channels";

/** Mirrors `IssueFeedActivityItemDto` from the API (subset used by the UI). */
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

/** Rich message bubble shape from `/channels/:id/messages` feed hydration. */
export type IssueFeedItem = {
  activityId: number;
  issueId: number;
  type: IssueFeedActivityType;
  actorId: number | null;
  /** Present when API hydrates users (actors may not be comment-channel peers). */
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

export type IssueFeed = {
  commentChannelId: number | null;
  items: IssueFeedItem[];
};
