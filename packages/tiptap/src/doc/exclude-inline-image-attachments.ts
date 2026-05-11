import type { JSONContent } from "@tiptap/core";
import { collectImageAttachmentIdsFromDoc } from "./collect-image-attachment-ids";

/**
 * For message/comment bubbles: omit attachment tiles already shown as inline images (`attachmentId` on
 * image nodes). Channel/issue file listings should pass the full attachment array instead.
 */
export function excludeInlineImageAttachmentsFromBubbleTiles<
  T extends { id: number },
>(doc: JSONContent | null | undefined, attachments: T[]): T[] {
  const inlineIds = new Set(collectImageAttachmentIdsFromDoc(doc));
  return attachments.filter((a) => !inlineIds.has(a.id));
}
