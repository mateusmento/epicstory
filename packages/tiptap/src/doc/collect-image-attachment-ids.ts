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

/** True when the doc tree contains at least one image node (including nodes without `attachmentId`). */
export function docContainsImageNodes(
  doc: JSONContent | null | undefined,
): boolean {
  let found = false;

  function walk(node: JSONContent | undefined): void {
    if (!node || found) return;
    if (node.type === "image") {
      found = true;
      return;
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }

  walk(doc ?? undefined);
  return found;
}
