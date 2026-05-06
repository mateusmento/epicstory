import type { JSONContent } from "@tiptap/core";

type DocJSON = JSONContent & { type: "doc"; content: JSONContent[] };

function isDocJSON(doc: unknown): doc is DocJSON {
  if (!doc || typeof doc !== "object") return false;
  const o = doc as { type?: string; content?: unknown };
  return o.type === "doc" && Array.isArray(o.content);
}

/**
 * Drops empty trailing paragraphs (including paragraph-with-only-hardBreaks) from a doc JSON.
 * Trims trailing newline(s) inside code blocks so `pre`/`whitespace-pre` does not show an extra empty line.
 */
export function normalizeTiptapDoc(doc: JSONContent): JSONContent {
  if (!doc || typeof doc !== "object") return doc;
  if (!isDocJSON(doc)) return doc;

  function isEmptyTrailingParagraph(node: JSONContent): boolean {
    if (node.type !== "paragraph") return false;
    if (!node.content || node.content.length === 0) return true;
    return node.content.every((c) => c.type === "hardBreak");
  }

  const next: JSONContent = { ...doc, content: [...doc.content] };
  while (
    next.content &&
    next.content.length > 0 &&
    isEmptyTrailingParagraph(next.content[next.content.length - 1]!)
  ) {
    next.content.pop();
  }
  return trimCodeBlocksInTree(next);
}

function trimCodeBlockTextNodes(content: JSONContent[]): JSONContent[] {
  if (content.length === 0) return content;
  const lastIdx = content.length - 1;
  const last = content[lastIdx]!;
  if (last.type !== "text" || typeof last.text !== "string") return content;
  const trimmed = last.text.replace(/\n+$/u, "");
  if (trimmed === last.text) return content;
  const copy = [...content];
  copy[lastIdx] = { ...last, text: trimmed };
  return copy;
}

function trimCodeBlocksInTree(node: JSONContent): JSONContent {
  if (node.type === "codeBlock" && Array.isArray(node.content)) {
    return { ...node, content: trimCodeBlockTextNodes(node.content) };
  }
  if (Array.isArray(node.content)) {
    return { ...node, content: node.content.map(trimCodeBlocksInTree) };
  }
  return node;
}
