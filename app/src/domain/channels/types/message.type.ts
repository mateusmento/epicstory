import type { User } from "@/domain/auth";
import type { IChannel } from "./channel.type";

export interface IMessage {
  id: number;
  content: string;
  sentAt: string;
  senderId: number;
  sender: User;
  channelId: number;
  channel: IChannel;
}

export type IMessageGroup = {
  id: number;
  senderId: number;
  sender: User;
  sentAt: string;
  messages: IMessage[];
};

export interface IMessageReaction {
  id: number;
  emoji: string;
  userId: number;
  user: User;
  messageId: number;
  message: IMessage;
}

export interface IReply {
  id: number;
  content: string;
  sentAt: string;
  senderId: number;
  sender: User;
  channelId: number;
  channel: IChannel;
  messageId: number;
  message: IMessage;
}

export interface IReplyReaction {
  id: number;
  emoji: string;
  userId: number;
  user: User;
  replyId: number;
  reply: IReply;
}

export type IReaction = {
  emoji: string;
  reactedBy: number[];
};
