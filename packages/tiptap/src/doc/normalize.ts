/**
 * Drops empty trailing paragraphs (including paragraph-with-only-hardBreaks) from a doc JSON.
 */
export function normalizeTiptapDoc(doc: unknown): any {
  if (!doc || typeof doc !== "object") return doc;
  const d = doc as { type?: string; content?: unknown[] };
  if (d.type !== "doc" || !Array.isArray(d.content)) return doc;

  function isEmptyTrailingParagraph(node: unknown) {
    if (!node || typeof node !== "object") return false;
    const n = node as { type?: string; content?: unknown[] };
    if (n.type !== "paragraph") return false;
    if (!n.content || n.content.length === 0) return true;
    return n.content.every((c: unknown) => {
      if (!c || typeof c !== "object") return false;
      return (c as { type?: string }).type === "hardBreak";
    });
  }

  const next = { ...d, content: [...d.content] };
  while (
    next.content.length > 0 &&
    isEmptyTrailingParagraph(next.content[next.content.length - 1])
  ) {
    next.content.pop();
  }
  return next;
}
