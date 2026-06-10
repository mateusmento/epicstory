import type { JSONContent } from "@tiptap/core";
import type {
  IAggregatedReaction,
  MessagePollBody,
  MessagePollClient,
} from "./channel-message";
import type { ReactionToggleAction } from "./channel-socket-events";

export type CreateDirectChannel = {
  type: "direct";
  peerId: number;
};

export type CreateDirectOrMultiDirectChannel = {
  type: "direct";
  peers: number[];
};

export type CreateGroupChannel = {
  type: "group";
  name: string;
  members?: number[];
};

export type CreateMeetingChannel = {
  type: "meeting";
  name: string;
  members?: number[];
};

export type CreateChannelBody =
  | CreateDirectChannel
  | CreateDirectOrMultiDirectChannel
  | CreateGroupChannel
  | CreateMeetingChannel;

export type VoteMessagePollResponse = {
  success?: boolean;
  channelId?: number;
  messageId?: number;
  poll: MessagePollClient;
};

export type ToggleReactionBody = {
  emoji: string;
};

export type ToggleReactionResponse = {
  success?: boolean;
  channelId?: number;
  messageId?: number;
  replyId?: number;
  emoji?: string;
  action?: ReactionToggleAction;
  reactions: IAggregatedReaction[];
};

export type SendMessageBody = {
  content: JSONContent;
  quotedMessageId?: number | null;
  attachmentIds?: number[];
  poll?: MessagePollBody;
};

export type UpdateChannelMessageBody = {
  content: JSONContent;
  attachmentIds?: number[];
  poll?: MessagePollBody | null;
};

export type UpdateReplyBody = {
  content: JSONContent;
  attachmentIds?: number[];
};

export type ReplyMessageBody = {
  content: JSONContent;
  quotedReplyId?: number;
  attachmentIds?: number[];
};

export type SendDirectMessageBody = {
  senderId: number;
  peers: number[];
  content: JSONContent;
};
