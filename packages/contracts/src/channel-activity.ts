import type { IMessage } from "./channel-message";
import type { IUser } from "./user";

export type ChannelActivityType =
  | "message_sent"
  | "attachment_added"
  | "meeting_started"
  | "user_added"
  | "user_removed"
  | "channel_renamed";

export type IChannelActivity = {
  id: number;
  channelId: number;
  type: ChannelActivityType;
  createdAt: string;
  actor: IUser | null;
  messageId: number | null;
  meetingId: number | null;
  payload: Record<string, unknown> | null;
  subjectUser?: IUser | null;
  message?: IMessage | null;
};

export type SendChannelMessageResponse = {
  message: IMessage;
  activity: IChannelActivity;
};

export type FindChannelActivities = {
  limit?: number;
  beforeCreatedAt?: string;
  beforeId?: number;
};
