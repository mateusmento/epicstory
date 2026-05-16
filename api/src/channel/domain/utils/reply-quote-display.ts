import {
  enrichMentionLabels,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import type { JSONContent } from '@tiptap/core';
import type { User } from 'src/auth';
import type { MessageReply } from '../entities/message-reply.entity';

export type QuotedReplyPreview = {
  id: number;
  sender: User;
  content: JSONContent;
  displayContent: string;
};

export function buildQuotedReplyPreview(
  r: MessageReply | null | undefined,
  peerUsersMap: Map<number, User>,
): QuotedReplyPreview | undefined {
  if (!r?.sender) return undefined;
  return {
    id: r.id,
    sender: r.sender,
    content: r.content,
    displayContent: tiptapDocToPlainDisplayText(
      enrichMentionLabels(r.content, peerUsersMap),
    ),
  };
}
