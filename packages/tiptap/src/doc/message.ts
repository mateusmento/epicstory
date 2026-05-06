import type { JSONContent } from "@tiptap/core";
import { normalizeTiptapDoc } from "./normalize";
import { tiptapToPlainText } from "./plain-text";

export function messageBodyPlainText(message: {
  content: JSONContent;
}): string {
  return tiptapToPlainText(normalizeTiptapDoc(message.content), {
    stripFormatting: true,
  });
}
