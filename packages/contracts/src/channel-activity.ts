import type { IMessage } from "./channel-message";

export type ChannelActivityType =
  | "message_sent"
  | "attachment_added"
  | "meeting_started"
  | "user_added"
  | "user_removed"
  | "channel_renamed";

export type ChannelActivityUserSummary = {
  id: number;
  name: string;
  picture?: string | null;
};

export type IChannelActivity = {
  id: number;
  channelId: number;
  type: ChannelActivityType;
  createdAt: string;
  actor: ChannelActivityUserSummary | null;
  messageId: number | null;
  meetingId: number | null;
  payload: Record<string, unknown> | null;
  subjectUser?: ChannelActivityUserSummary | null;
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
