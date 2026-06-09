import type { JSONContent } from "@tiptap/core";
import type {
  IAggregatedReaction,
  MessagePollBody,
  MessagePollClient,
} from "./channel-message";

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

export type VoteMessagePollResponse = {
  success?: boolean;
  channelId?: number;
  messageId?: number;
  poll: MessagePollClient;
};

export type ToggleReactionResponse = {
  success?: boolean;
  reactions: IAggregatedReaction[];
};

export type SendMessageBody = {
  content: JSONContent;
  quotedMessageId?: number;
  attachmentIds?: number[];
  poll?: MessagePollBody;
};

export type UpdateChannelMessageBody = {
  content: JSONContent;
  attachmentIds?: number[];
  poll?: MessagePollBody | null;
};

export type ReplyMessageBody = {
  content: JSONContent;
  quotedReplyId?: number;
  attachmentIds?: number[];
};
