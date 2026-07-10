import type { JSONContent } from "@tiptap/core";

/** TipTap node type for inline issue badges in channel/issue rich text. */
export const TIPTAP_ISSUE_NODE_TYPE = "issue";

/** Numeric issue ids from `issue` nodes in a TipTap JSON document. */
export function extractIssueIds(doc: JSONContent | null | undefined): number[] {
  if (!doc) return [];
  const ids = new Set<number>();

  function visit(node: JSONContent) {
    if (node.type === TIPTAP_ISSUE_NODE_TYPE) {
      const raw = node.attrs?.issueId ?? node.attrs?.id;
      const id = Number(raw);
      if (Number.isFinite(id)) ids.add(id);
    }
    for (const child of node.content ?? []) visit(child);
  }

  visit(doc);
  return Array.from(ids);
}
