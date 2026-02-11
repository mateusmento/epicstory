export function normalizeTiptapDoc(doc: any): any {
  if (!doc || typeof doc !== "object") return doc;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return doc;

  function isEmptyTrailingParagraph(node: any) {
    if (!node || node.type !== "paragraph") return false;
    if (!node.content || node.content.length === 0) return true;
    return node.content.every((c: any) => c?.type === "hardBreak");
  }

  const next = { ...doc, content: [...doc.content] };
  while (next.content.length > 0 && isEmptyTrailingParagraph(next.content[next.content.length - 1])) {
    next.content.pop();
  }
  return next;
}

export function tiptapToPlainText(doc: any): string {
  if (!doc) return "";

  return walk(normalizeTiptapDoc(doc))
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function walk(node: any, ctx?: { inListItem?: boolean }): string {
  const type = node?.type ?? "";
  if (type === "text") return node.text ?? "";
  if (type === "hardBreak") return "\n";
  if (type === "doc") return (node?.content ?? []).map((c: any) => walk(c, ctx)).join("");
  if (type === "mention") {
    const id = node?.attrs?.id ?? node?.attrs?.userId;
    return id === undefined || id === null ? "@" : `@${id}`;
  }

  if (type === "listItem") {
    const children = (node?.content ?? []).map((c: any) => walk(c, { ...ctx, inListItem: true })).join("");
    return children + "\n";
  }

  const children = (node?.content ?? []).map((c: any) => walk(c, ctx)).join("");

  if ((type === "paragraph" || type === "heading" || type === "blockquote") && ctx?.inListItem) {
    return children;
  }

  if (type === "paragraph" || type === "heading" || type === "blockquote") return children + "\n";
  if (type === "bulletList" || type === "orderedList") return children;
  return children;
}
