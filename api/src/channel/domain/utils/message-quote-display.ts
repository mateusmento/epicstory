import {
  enrichMentionLabels,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import type { JSONContent } from '@tiptap/core';
import type { User } from 'src/auth';
import type { Message } from '../entities/message.entity';

export type QuotedMessagePreview = {
  id: number;
  sender: User;
  content: JSONContent;
  displayContent: string;
};

export function buildQuotedMessagePreview(
  m: Message | null | undefined,
  peerUsersMap: Map<number, User>,
): QuotedMessagePreview | undefined {
  if (!m?.sender) return undefined;
  return {
    id: m.id,
    sender: m.sender,
    content: m.content,
    displayContent: tiptapDocToPlainDisplayText(
      enrichMentionLabels(m.content, peerUsersMap),
    ),
  };
}
