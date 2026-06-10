import type { IChannelActivity } from "./channel-activity";
import type { IAggregatedReaction, IMessage, IReply } from "./channel-message";

export type SubscribeMessagesBody = {
  workspaceId: number;
};

export type ChannelTypingPulseBody = {
  channelId: number;
};

export type ChannelTypingStopBody = ChannelTypingPulseBody;

export type IncomingChannelActivityEvent = {
  activity: IChannelActivity;
  channelId: number;
};

export type IncomingReplyEvent = {
  reply: IReply;
  messageId: number;
  channelId: number;
};

export type ReplyUpdatedEvent = {
  reply: IReply;
  channelId: number;
  messageId: number;
};

export type ReplyDeletedEvent = {
  replyId: number;
  messageId: number;
  channelId: number;
};

export type MessageDeletedEvent = {
  messageId: number;
  channelId: number;
};

export type MessageUpdatedEvent = {
  message: IMessage;
  channelId: number;
};

export type MessagePollUpdatedEvent = {
  channelId: number;
  messageId: number;
  optionVotes: Record<string, number>;
  totalVotes: number;
};

export type UserTypingEvent = {
  channelId: number;
  userId: number;
};

export type UserTypingStoppedEvent = UserTypingEvent;

export type ReactionToggleAction = "added" | "removed";

export type IncomingMessageReactionEvent = {
  messageId: number;
  emoji: string;
  userId: number;
  action: ReactionToggleAction;
  reactions: IAggregatedReaction[];
};

export type IncomingReplyReactionEvent = {
  replyId: number;
  emoji: string;
  userId: number;
  action: ReactionToggleAction;
  reactions: IAggregatedReaction[];
};
