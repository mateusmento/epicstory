import type {
  IssueReference,
  IQuotedMessagePreview,
} from '@epicstory/contracts';
import {
  enrichMentionLabels,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import type { User } from 'src/auth';
import type { Message } from '../entities/message.entity';

export function buildQuotedMessagePreview(
  m: Message | null | undefined,
  peerUsersMap: Map<number, User>,
  issue?: IssueReference | null,
): IQuotedMessagePreview | undefined {
  if (!m?.sender) return undefined;
  return {
    id: m.id,
    sender: m.sender,
    content: m.content,
    displayContent: tiptapDocToPlainDisplayText(
      enrichMentionLabels(m.content, peerUsersMap),
    ),
    ...(issue ? { issue } : {}),
  };
}
