import type { JSONContent } from "@tiptap/core";
import cloneDeep from "lodash/cloneDeep";

/** Numeric user ids from `mention` nodes in a TipTap JSON document. */
export function extractMentionIds(
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

/**
 * Fill `mention.attrs.label` from `usersById` (overwrites any existing label).
 *
 * Returns the same `doc` reference if there are no changes; otherwise returns a deep-cloned doc.
 */
export function enrichMentionLabels<TUser extends { name: string }>(
  doc: JSONContent | null | undefined,
  usersById: Map<number, TUser>,
): JSONContent | null | undefined {
  if (!doc) return doc;

  let mutated = false;
  const out = cloneDeep(doc) as JSONContent;

  function visit(node: JSONContent) {
    if (node.type === "mention" && node.attrs) {
      const raw = node.attrs.id ?? node.attrs.userId;
      const id = Number(raw);
      if (Number.isFinite(id)) {
        const user = usersById.get(id);
        if (user) {
          const nextLabel = user.name;
          if (node.attrs.label !== nextLabel) {
            node.attrs = { ...node.attrs, label: nextLabel };
            mutated = true;
          }
        }
      }
    }
    for (const child of node.content ?? []) visit(child);
  }

  visit(out);
  return mutated ? out : doc;
}
