import type { JSONContent } from "@tiptap/core";
import MarkdownIt from "markdown-it";
import { MarkdownParser, defaultMarkdownParser } from "prosemirror-markdown";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

/**
 * Parse Markdown into TipTap `JSONContent` (ProseMirror doc JSON).
 *
 * Focus: good fidelity for Linear issue descriptions (headings, blockquotes, lists,
 * links, fenced code blocks with language).
 */
export function markdownToTiptapDoc(markdown: string): JSONContent {
  const normalize = (node: any): JSONContent => {
    if (!node || typeof node !== "object") return node as JSONContent;

    // Normalize node.type from ProseMirror markdown schema to TipTap JSON.
    const typeMap: Record<string, string> = {
      code_block: "codeBlock",
      bullet_list: "bulletList",
      ordered_list: "orderedList",
      list_item: "listItem",
      hard_break: "hardBreak",
      horizontal_rule: "horizontalRule",
    };

    const out: any = { ...node };
    out.type = typeMap[out.type] ?? out.type;

    // Normalize attrs across node type renames.
    if (node.type === "code_block") {
      const params = String(node.attrs?.params ?? "").trim();
      const language = params ? params.split(/\s+/)[0] : "";
      out.attrs = {
        ...(node.attrs ?? {}),
        ...(language ? { language } : {}),
      };
      delete out.attrs.params;
    }

    if (node.type === "ordered_list") {
      const order = node.attrs?.order;
      const start =
        typeof order === "number" && Number.isFinite(order) ? order : undefined;
      out.attrs = {
        ...(node.attrs ?? {}),
        ...(start != null ? { start } : {}),
      };
      delete out.attrs.order;
    }

    // Normalize mark types (ProseMirror -> TipTap).
    if (Array.isArray(out.marks)) {
      const markTypeMap: Record<string, string> = {
        strong: "bold",
        em: "italic",
      };
      out.marks = out.marks.map((m: any) => ({
        ...m,
        type: markTypeMap[m?.type] ?? m?.type,
      }));
    }

    if (Array.isArray(out.content)) {
      out.content = out.content.map(normalize);
    }

    return out as JSONContent;
  };

  const md = (markdown ?? "").trim();
  if (!md) {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    };
  }

  // Start from the ProseMirror basic schema and add list nodes.
  const schema = new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
    marks: basicSchema.spec.marks,
  });

  // Use the default markdown-it instance and default token mapping.
  // `defaultMarkdownParser` is constructed with a different schema, so we need to
  // reuse its token mapping with our schema.
  const parser = new MarkdownParser(
    schema,
    new MarkdownIt("commonmark", { html: false, linkify: true }),
    (defaultMarkdownParser as any).tokens,
  );

  const doc = parser.parse(md);
  return normalize(doc.toJSON()) as JSONContent;
}
