import type { IAggregatedReaction, IMessage, IReply, MessagePollClient, IUser } from "@epicstory/contracts";

export type IMessagePollClient = MessagePollClient;

export type IMessageGroup<M extends IMessage | IReply = IMessage> = {
  id: number;
  senderId: number;
  sender: IUser;
  sentAt: string;
  messages: M[];
};

export type IMessageAggregation = {
  reactions: IAggregatedReaction[];
  replies: IAggregatedReply;
};

export type IMessageReaction = {
  id: number;
  emoji: string;
  userId: number;
  user: IUser;
  messageId: number;
  message: IMessage;
};

export type IReplyReaction = {
  id: number;
  emoji: string;
  userId: number;
  user: IUser;
  replyId: number;
  reply: IReply;
};

export type IAggregatedReply = {
  count: number;
  repliedBy: IUser[];
};
