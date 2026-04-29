import type { JSONContent } from "@tiptap/core";

/**
 * Reads `attachmentId` from image nodes (composer staging uploads linked on send).
 */
export function collectImageAttachmentIdsFromDoc(
  doc: JSONContent | null | undefined,
): number[] {
  const ids = new Set<number>();

  function walk(node: JSONContent | undefined): void {
    if (!node) return;
    if (node.type === "image") {
      const aid = node.attrs?.attachmentId;
      if (typeof aid === "number" && Number.isFinite(aid)) {
        ids.add(aid);
      }
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }

  walk(doc ?? undefined);
  return [...ids];
}
