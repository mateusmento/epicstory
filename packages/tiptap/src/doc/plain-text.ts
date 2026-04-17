import type { TiptapJSONNode } from "./types";
import { normalizeTiptapDoc } from "./normalize";

type WalkCtx = { inListItem?: boolean; inTableCell?: boolean };

function walk(node: TiptapJSONNode, ctx?: WalkCtx): string {
  const type = node?.type ?? "";
  if (type === "text") return node.text ?? "";
  if (type === "hardBreak") return "\n";
  if (type === "doc")
    return (node.content ?? []).map((c) => walk(c, ctx)).join("");
  if (type === "mention") {
    const id = node.attrs?.id ?? node.attrs?.userId;
    return id === undefined || id === null ? "@" : `@${id}`;
  }

  if (type === "taskList") {
    return (node.content ?? []).map((c) => walk(c, ctx)).join("");
  }

  if (type === "taskItem") {
    const checked = node.attrs?.checked === true;
    const mark = checked ? "[x] " : "[ ] ";
    const inner = (node.content ?? [])
      .map((c) => walk(c, { ...ctx, inListItem: true }))
      .join("");
    return mark + inner + "\n";
  }

  if (type === "listItem") {
    const children = (node.content ?? [])
      .map((c) => walk(c, { ...ctx, inListItem: true }))
      .join("");
    return children + "\n";
  }

  if (type === "table") {
    const rows = (node.content ?? []).map((c) => walk(c, ctx)).join("");
    return rows ? `\n${rows.trimEnd()}\n` : "";
  }

  if (type === "tableRow") {
    const cells = (node.content ?? []).map((c) => {
      const t = walk(c, { ...ctx, inTableCell: true })
        .replace(/\s+/g, " ")
        .trim();
      return t;
    });
    return cells.join("\t") + "\n";
  }

  if (type === "tableCell" || type === "tableHeader") {
    return (node.content ?? []).map((c) => walk(c, { ...ctx, inTableCell: true })).join("");
  }

  if (type === "image") {
    const src = String(node.attrs?.src ?? "").trim();
    return src ? `[image: ${src}]\n` : "";
  }

  if (type === "codeBlock") {
    const langRaw = node.attrs?.language;
    const lang =
      typeof langRaw === "string" && langRaw.trim().length > 0
        ? `${langRaw.trim()}\n`
        : "";
    const body = (node.content ?? []).map((c) => walk(c, ctx)).join("");
    return lang + (body || "") + "\n";
  }

  const children = (node.content ?? []).map((c) => walk(c, ctx)).join("");

  if (
    (type === "paragraph" ||
      type === "heading" ||
      type === "blockquote") &&
    (ctx?.inListItem || ctx?.inTableCell)
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
