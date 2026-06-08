import type { IAggregatedReaction, IMessage, IReply, MessagePollClient, IUser } from "@epicstory/contracts";

export type IMessagePollClient = MessagePollClient;

export type { IMessageGroup } from "@/lib/chat-timeline";

/** @deprecated NOT USED ANYWHERE AND CAN BE REMOVED */
export type IMessageAggregation = {
  reactions: IAggregatedReaction[];
  replies: IAggregatedReply;
};

/** @deprecated NOT USED ANYWHERE AND CAN BE REMOVED */
export type IMessageReaction = {
  id: number;
  emoji: string;
  userId: number;
  user: IUser;
  messageId: number;
  message: IMessage;
};

/** @deprecated NOT USED ANYWHERE AND CAN BE REMOVED */
export type IReplyReaction = {
  id: number;
  emoji: string;
  userId: number;
  user: IUser;
  replyId: number;
  reply: IReply;
};

/** @deprecated NOT USED ANYWHERE AND CAN BE REMOVED */
export type IAggregatedReply = {
  count: number;
  repliedBy: IUser[];
};
