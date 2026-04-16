import type { TiptapJSONNode } from "./types";
import { normalizeTiptapDoc } from "./normalize";

function walk(node: TiptapJSONNode, ctx?: { inListItem?: boolean }): string {
  const type = node?.type ?? "";
  if (type === "text") return node.text ?? "";
  if (type === "hardBreak") return "\n";
  if (type === "doc")
    return (node.content ?? []).map((c) => walk(c, ctx)).join("");
  if (type === "mention") {
    const id = node.attrs?.id ?? node.attrs?.userId;
    return id === undefined || id === null ? "@" : `@${id}`;
  }

  if (type === "listItem") {
    const children = (node.content ?? [])
      .map((c) => walk(c, { ...ctx, inListItem: true }))
      .join("");
    return children + "\n";
  }

  if (type === "codeBlock") {
    const body = (node.content ?? []).map((c) => walk(c, ctx)).join("");
    return (body || "") + "\n";
  }

  const children = (node.content ?? []).map((c) => walk(c, ctx)).join("");

  if (
    (type === "paragraph" ||
      type === "heading" ||
      type === "blockquote") &&
    ctx?.inListItem
  ) {
    return children;
  }

  if (type === "paragraph" || type === "heading" || type === "blockquote") {
    return children + "\n";
  }
  if (type === "bulletList" || type === "orderedList") return children;

  return children;
}

export function tiptapToPlainText(
  doc: TiptapJSONNode | null | undefined,
): string {
  if (!doc) return "";

  return walk(normalizeTiptapDoc(doc) as TiptapJSONNode)
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
