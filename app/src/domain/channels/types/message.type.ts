import type { User } from "@/domain/auth";
import type { IChannel } from "./channel.type";

/** Server-hydrated quote body; `id` is `messages.id` or a thread `message_replies.id`. */
export type IQuotedMessagePreview = {
  id: number;
  sender: User;
  content: string;
  contentRich?: any;
  displayContent?: string;
};

export interface IMessage {
  id: number;
  content: string;
  contentRich?: any;
  displayContent?: string;
  quotedMessageId?: number | null;
  quotedMessage?: IQuotedMessagePreview;
  editedAt?: string | null;
  isScheduled?: boolean;
  mentionedUsers?: User[];
  sentAt: string;
  senderId: number;
  sender: User;
  channelId: number;
  channel: IChannel;

  repliesCount: number;
  repliers: { user: User; repliesCount: number }[];
  reactions: IAggregatedReaction[];
}

export type IMessageGroup<M extends IMessage | IReply = IMessage> = {
  id: number;
  senderId: number;
  sender: User;
  sentAt: string;
  messages: M[];
};

export type IMessageAggregation = {
  reactions: IAggregatedReaction[];
  replies: IAggregatedReply;
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
  contentRich?: any;
  displayContent?: string;
  /** `message_replies.id` of the quoted reply in the same thread. */
  quotedReplyId?: number | null;
  /** Hydrated body of the quoted reply (or thread root, same shape for UI). */
  quotedMessage?: IQuotedMessagePreview;
  mentionedUsers?: User[];
  isScheduled?: boolean;
  sentAt: string;
  senderId: number;
  sender: User;
  channelId: number;
  channel: IChannel;
  messageId: number;
  message: IMessage;

  repliesCount: number;
  repliers: { user: User; repliesCount: number }[];
  reactions: IAggregatedReaction[];
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
  reactedBy: User;
};

export type IAggregatedReaction = {
  emoji: string;
  reactedBy: User[];
  firstReactedAt: string;
  reactedByMe: boolean;
};

export type IAggregatedReply = {
  count: number;
  repliedBy: User[];
};
