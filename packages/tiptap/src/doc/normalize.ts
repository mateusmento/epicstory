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
  const normalizedNames = normalizeProseMirrorJsonNames(doc);
  if (!isDocJSON(normalizedNames)) return normalizedNames;

  function isEmptyTrailingParagraph(node: JSONContent): boolean {
    if (node.type !== "paragraph") return false;
    if (!node.content || node.content.length === 0) return true;
    return node.content.every((c) => c.type === "hardBreak");
  }

  const next: JSONContent = {
    ...normalizedNames,
    content: [...(normalizedNames.content ?? [])],
  };
  while (
    next.content &&
    next.content.length > 0 &&
    isEmptyTrailingParagraph(next.content[next.content.length - 1]!)
  ) {
    next.content.pop();
  }
  return trimCodeBlocksInTree(next);
}

/**
 * Compatibility: normalize ProseMirror-markdown JSON node/mark names into TipTap JSONContent names.
 * This lets us render/import docs created by `prosemirror-markdown` (e.g. `code_block`, `bullet_list`)
 * without sprinkling one-off cases throughout the app.
 */
function normalizeProseMirrorJsonNames(node: JSONContent): JSONContent {
  const typeMap: Record<string, string> = {
    code_block: "codeBlock",
    bullet_list: "bulletList",
    ordered_list: "orderedList",
    list_item: "listItem",
    hard_break: "hardBreak",
    horizontal_rule: "horizontalRule",
  };

  const markTypeMap: Record<string, string> = {
    strong: "bold",
    em: "italic",
  };

  const rawType = node?.type ?? "";
  const nextType = typeMap[rawType] ?? rawType;

  let next: JSONContent =
    nextType === rawType ? node : { ...node, type: nextType };

  // code_block language lives in attrs.params; TipTap uses attrs.language.
  if (rawType === "code_block") {
    const params = String(node.attrs?.params ?? "").trim();
    const language = params ? params.split(/\s+/)[0] : "";
    const attrs: Record<string, unknown> = { ...(node.attrs ?? {}) };
    delete attrs.params;
    if (language) attrs.language = language;
    next = { ...next, attrs };
  }

  // ordered_list uses attrs.order; TipTap uses attrs.start.
  if (rawType === "ordered_list") {
    const order = (node.attrs as any)?.order;
    const start =
      typeof order === "number" && Number.isFinite(order) ? order : undefined;
    if (start != null) {
      const attrs: Record<string, unknown> = { ...(node.attrs ?? {}) };
      delete (attrs as any).order;
      attrs.start = start;
      next = { ...next, attrs };
    } else if (node.attrs && "order" in (node.attrs as any)) {
      const attrs: Record<string, unknown> = { ...(node.attrs ?? {}) };
      delete (attrs as any).order;
      next = { ...next, attrs };
    }
  }

  if (Array.isArray(next.marks)) {
    next = {
      ...next,
      marks: next.marks.map((m) => ({
        ...m,
        type: markTypeMap[(m as any).type] ?? (m as any).type,
      })),
    };
  }

  if (Array.isArray(next.content)) {
    next = {
      ...next,
      content: next.content.map(normalizeProseMirrorJsonNames),
    };
  }

  return next;
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
