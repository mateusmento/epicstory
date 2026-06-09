import type { IMessage, IReply } from "./channel-message";
import type {
  IssueActivityPayloadFor,
  IssueFeedActivityType,
} from "./issue-activity-payload";
import type { IUser } from "./user";

export type { IssueFeedActivityType } from "./issue-activity-payload";

export type IIssueFeedItemBase = {
  activityId: number;
  issueId: number;
  actorId: number | null;
  actor?: IUser | null;
  createdAt: string;
  messageId: number | null;
  attachmentId: number | null;
  message: IMessage | null;
  replyPreviews: IReply[];
  repliesTotal?: number;
  hasMoreOlder?: boolean;
};

/** One feed row for a specific activity `type` — payload is narrowed to match. */
export type IIssueFeedItemFor<T extends IssueFeedActivityType> =
  IIssueFeedItemBase & {
    type: T;
    payload: IssueActivityPayloadFor<T>;
  };

/** Discriminated union: switch on `item.type` narrows `item.payload` automatically. */
export type IIssueFeedItem = {
  [K in IssueFeedActivityType]: IIssueFeedItemFor<K>;
}[IssueFeedActivityType];

export type IIssueFeed = {
  commentChannelId: number | null;
  items: IIssueFeedItem[];
};
