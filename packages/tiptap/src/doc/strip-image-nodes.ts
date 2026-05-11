import type { JSONContent } from "@tiptap/core";

/**
 * Removes `image` nodes from a TipTap JSON document.
 * Used for plain-text excerpts (notifications, sidebar copy, quotes) — **not** for persisted message body;
 * stored docs keep inline `image` nodes while `attachmentIds` still anchor files for listings.
 */
export function stripImageNodesFromDoc(doc: JSONContent): JSONContent {
  if (!doc || typeof doc !== "object") return doc;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) {
    return doc;
  }
  return {
    ...doc,
    content: stripImagesInNodes(doc.content),
  };
}

function stripImagesInNodes(nodes: JSONContent[]): JSONContent[] {
  const out: JSONContent[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    if (n.type === "image") continue;
    if (Array.isArray(n.content) && n.content.length > 0) {
      const nextContent = stripImagesInNodes(n.content);
      out.push({ ...n, content: nextContent });
    } else {
      out.push(n);
    }
  }
  return out;
}
