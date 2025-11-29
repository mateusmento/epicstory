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
  parentMessageId?: number;
}

export type IMessageGroup = {
  id: number;
  senderId: number;
  sender: User;
  sentAt: string;
  messages: IMessage[];
};
