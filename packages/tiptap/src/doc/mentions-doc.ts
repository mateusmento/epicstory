import type { TiptapJSONNode } from "./types";

/** Numeric user ids from `mention` nodes in a TipTap JSON document. */
export function extractMentionIdsFromDoc(
  doc: TiptapJSONNode | null | undefined,
): number[] {
  if (!doc) return [];
  const ids = new Set<number>();

  function visit(node: TiptapJSONNode) {
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
