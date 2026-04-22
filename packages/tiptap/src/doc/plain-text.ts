import type { TiptapJSONNode } from "./types";
import { normalizeTiptapDoc } from "./normalize";

type WalkCtx = {
  inListItem?: boolean;
  inTableCell?: boolean;
  stripFormatting?: boolean;
};

function applyTextMarks(
  text: string,
  marks: unknown[] | undefined,
  stripFormatting?: boolean,
): string {
  let t = text.replace(/\u200b/g, "");
  const list = (marks ?? []) as { type?: string }[];
  if (list.some((m) => m.type === "code")) {
    if (t === "") return "";
    if (!stripFormatting) t = `\`${t}\``;
  }
  return t;
}

function walk(node: TiptapJSONNode, ctx?: WalkCtx): string {
  const type = node?.type ?? "";
  if (type === "text")
    return applyTextMarks(
      node.text ?? "",
      node.marks as unknown[] | undefined,
      ctx?.stripFormatting,
    );
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
    const sep = ctx?.stripFormatting ? " " : "\t";
    return cells.join(sep) + "\n";
  }

  if (type === "tableCell" || type === "tableHeader") {
    return (node.content ?? [])
      .map((c) => walk(c, { ...ctx, inTableCell: true }))
      .join("");
  }

  if (type === "image") {
    const src = String(node.attrs?.src ?? "").trim();
    if (!src) return "";
    if (ctx?.stripFormatting) return `${src}\n`;
    return `[image: ${src}]\n`;
  }

  if (type === "codeBlock") {
    const body = (node.content ?? []).map((c) => walk(c, ctx)).join("");
    if (ctx?.stripFormatting) return (body || "") + "\n";
    const langRaw = node.attrs?.language;
    const lang =
      typeof langRaw === "string" && langRaw.trim().length > 0
        ? `${langRaw.trim()}\n`
        : "";
    return lang + (body || "") + "\n";
  }

  const children = (node.content ?? []).map((c) => walk(c, ctx)).join("");

  if (type === "blockquote") {
    const trimmed = children.replace(/\n+$/u, "");
    if (ctx?.stripFormatting) {
      if (ctx?.inListItem || ctx?.inTableCell) return trimmed;
      return trimmed ? `${trimmed}\n` : "";
    }
    const lines = trimmed.length > 0 ? trimmed.split("\n") : [""];
    const body = lines.map((line) => `> ${line}`).join("\n");
    if (ctx?.inListItem || ctx?.inTableCell) return body;
    return `${body}\n`;
  }

  if (
    (type === "paragraph" || type === "heading") &&
    (ctx?.inListItem || ctx?.inTableCell)
  ) {
    return children;
  }

  if (type === "paragraph" || type === "heading") {
    return children + "\n";
  }
  if (type === "bulletList" || type === "orderedList") return children;

  return children;
}

export type TiptapToPlainTextOptions = {
  /**
   * When true, omit pseudo-markdown and layout markers (blockquote `> `, inline
   * code backticks, code-block language line, `[image: …]` wrapper, table tabs).
   * Use for persisted message `content` and search/notifications.
   */
  stripFormatting?: boolean;
};

export function tiptapToPlainText(
  doc: TiptapJSONNode | null | undefined,
  options?: TiptapToPlainTextOptions,
): string {
  if (!doc) return "";

  const ctx: WalkCtx | undefined = options?.stripFormatting
    ? { stripFormatting: true }
    : undefined;

  return walk(normalizeTiptapDoc(doc) as TiptapJSONNode, ctx)
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
