import type { AnyExtension } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import { normalizeTiptapDoc } from "./normalize";
import { EMPTY_RICH_TEXT_DOCUMENT, type RichTextDocument } from "./types";

export function richTextDocumentToHtml(
  doc: RichTextDocument | null | undefined,
  extensions: AnyExtension[],
): string {
  const normalized = normalizeTiptapDoc(doc ?? EMPTY_RICH_TEXT_DOCUMENT);
  return generateHTML(normalized as Record<string, unknown>, extensions);
}
