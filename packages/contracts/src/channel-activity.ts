import type { ChannelActivityPayloadFor } from "./channel-activity-payload";
import type { IMessage } from "./channel-message";
import type { IUser } from "./user";

export type ChannelActivityType =
  | "message_sent"
  | "attachment_added"
  | "meeting_started"
  | "user_added"
  | "user_removed"
  | "channel_renamed";

export type IChannelActivityBase = {
  id: number;
  channelId: number;
  createdAt: string;
  actor: IUser | null;
  messageId: number | null;
  meetingId: number | null;
  subjectUser?: IUser | null;
  message?: IMessage | null;
};

/** One activity row for a specific `type` — payload is narrowed to match. */
export type IChannelActivityFor<T extends ChannelActivityType> =
  IChannelActivityBase & {
    type: T;
    payload: ChannelActivityPayloadFor<T>;
  };

/** Discriminated union: switch on `activity.type` narrows `activity.payload` automatically. */
export type IChannelActivity = {
  [K in ChannelActivityType]: IChannelActivityFor<K>;
}[ChannelActivityType];

export type SendChannelMessageResponse = {
  message: IMessage;
  activity: IChannelActivity;
};

export type FindChannelActivities = {
  limit?: number;
  beforeCreatedAt?: string;
  beforeId?: number;
};
