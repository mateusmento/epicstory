import type { JSONContent } from "@tiptap/core";

/** Numeric user ids from `mention` nodes in a TipTap JSON document. */
export function extractMentionIdsFromDoc(
  doc: JSONContent | null | undefined,
): number[] {
  if (!doc) return [];
  const ids = new Set<number>();

  function visit(node: JSONContent) {
    if (node.type === "mention") {
      const raw = node.attrs?.id ?? node.attrs?.userId;
      const id = Number(raw);
      if (Number.isFinite(id)) ids.add(id);
    }
    for (const child of node.content ?? []) visit(child);
  }

  visit(doc);
  return Array.from(ids);
}
