/**
 * Drops empty trailing paragraphs (including paragraph-with-only-hardBreaks) from a doc JSON.
 * Trims trailing newline(s) inside code blocks so `pre`/`whitespace-pre` does not show an extra empty line.
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
  return trimCodeBlocksInTree(next);
}

function trimCodeBlockTextNodes(content: unknown[]): unknown[] {
  if (content.length === 0) return content;
  const lastIdx = content.length - 1;
  const last = content[lastIdx] as { type?: string; text?: string };
  if (last?.type !== "text" || typeof last.text !== "string") return content;
  const trimmed = last.text.replace(/\n+$/u, "");
  if (trimmed === last.text) return content;
  const copy = [...content];
  copy[lastIdx] = { ...last, text: trimmed };
  return copy;
}

function trimCodeBlocksInTree(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const o = node as { type?: string; content?: unknown[] };
  if (o.type === "codeBlock" && Array.isArray(o.content)) {
    return { ...o, content: trimCodeBlockTextNodes(o.content) };
  }
  if (Array.isArray(o.content)) {
    return { ...o, content: o.content.map(trimCodeBlocksInTree) };
  }
  return node;
}
