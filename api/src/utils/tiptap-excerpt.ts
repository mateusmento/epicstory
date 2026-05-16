import { TIPTAP_NOTIFICATION_EXCERPT_MAX } from '@epicstory/contracts';
import {
  enrichMentionLabels,
  extractMentionIds,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import type { JSONContent } from '@tiptap/core';
import type { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { truncateText } from './text';

export {
  TIPTAP_ISSUE_DESCRIPTION_ACTIVITY_EXCERPT_MAX,
  TIPTAP_NOTIFICATION_EXCERPT_MAX,
} from '@epicstory/contracts';

/**
 * Plain excerpt from TipTap JSON (normalize → strip images → flatten formatting).
 * No workspace mention resolution — use {@link excerptFromTiptapDocWithWorkspaceMembers} for channel copy.
 */
export function excerptFromTiptapDoc(
  doc: JSONContent | null | undefined,
  options?: { max?: number },
): string {
  if (doc == null || typeof doc !== 'object') return '';
  const plain = tiptapDocToPlainDisplayText(doc);
  return truncateText(plain, options?.max ?? TIPTAP_NOTIFICATION_EXCERPT_MAX);
}

/** Same as {@link excerptFromTiptapDoc}, but `undefined` when the excerpt is empty. */
export function excerptFromTiptapDocOptional(
  doc: JSONContent | null | undefined,
  options?: { max?: number },
): string | undefined {
  const s = excerptFromTiptapDoc(doc, options);
  return s === '' ? undefined : s;
}

/** Mention-aware excerpt for workspace-scoped channel content (notifications, etc.). */
export async function excerptFromTiptapDocWithWorkspaceMembers(
  workspaceRepo: WorkspaceRepository,
  workspaceId: number,
  doc: JSONContent | null | undefined,
  options?: { max?: number },
): Promise<string> {
  if (doc == null || typeof doc !== 'object') return '';
  const mentionIds = extractMentionIds(doc);
  const membersMap = await workspaceRepo.findMembersMap(
    workspaceId,
    mentionIds,
  );
  const labelled = enrichMentionLabels(doc, membersMap);
  const plain = tiptapDocToPlainDisplayText(labelled);
  return truncateText(plain, options?.max ?? TIPTAP_NOTIFICATION_EXCERPT_MAX);
}
