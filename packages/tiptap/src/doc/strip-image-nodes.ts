/**
 * Removes `image` nodes from a TipTap JSON document so file attachments are only linked out-of-band.
 */
export function stripImageNodesFromDoc(doc: unknown): unknown {
  if (!doc || typeof doc !== "object") return doc;
  const root = doc as { type?: string; content?: unknown[] };
  if (root.type !== "doc" || !Array.isArray(root.content)) {
    return doc;
  }
  return {
    ...root,
    content: stripImagesInNodes(root.content),
  };
}

function stripImagesInNodes(nodes: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const o = n as { type?: string; content?: unknown[] };
    if (o.type === "image") continue;
    if (Array.isArray(o.content) && o.content.length > 0) {
      const nextContent = stripImagesInNodes(o.content);
      out.push({ ...o, content: nextContent });
    } else {
      out.push(o);
    }
  }
  return out;
}
