import type { RichTextDocument } from "./types";

/**
 * Builds a minimal TipTap doc from legacy plain-text bodies (varchar migrations, imports).
 * Split by newlines into paragraphs (CRLF normalized).
 */
export function legacyPlainTextToRichTextDocument(text: string): RichTextDocument {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const content = lines.map((line) => ({
    type: "paragraph",
    content:
      line.length > 0 ? [{ type: "text", text: line }] : ([] as unknown[]),
  }));
  return {
    type: "doc",
    content,
  };
}
