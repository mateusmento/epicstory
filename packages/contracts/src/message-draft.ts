import type { JSONContent } from "@tiptap/core";
import type { UploadedAttachment } from "./attachment";
import type { MessagePollBody } from "./channel-message";

export type IMessageDraft = {
  id: number;
  workspaceId: number;
  channelId: number;
  authorId: number;
  threadMessageId: number | null;
  content: JSONContent;
  poll: MessagePollBody | null;
  quotedMessageId: number | null;
  quotedReplyId: number | null;
  version: number;
  expiresAt: string;
  updatedAt: string;
  attachments: UploadedAttachment[];
};

export type IMessageDraftListItem = {
  id: number;
  workspaceId: number;
  channelId: number;
  threadMessageId: number | null;
  updatedAt: string;
  expiresAt: string;
  preview: string;
};

export type UpsertMessageDraftBody = {
  content: JSONContent;
  poll?: MessagePollBody | null;
  quotedMessageId?: number | null;
  quotedReplyId?: number | null;
  attachmentIds?: number[];
  /** Current known version; use 0 when creating. */
  version?: number;
};
