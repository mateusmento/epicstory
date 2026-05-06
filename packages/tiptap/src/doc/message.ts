import type { JSONContent } from "@tiptap/core";
import { normalizeTiptapDoc } from "./normalize";
import { tiptapToPlainText } from "./plain-text";

export function messageBodyPlainText(message: {
  content: string;
  contentRich?: JSONContent;
}): string {
  if (message.contentRich) {
    return tiptapToPlainText(normalizeTiptapDoc(message.contentRich), {
      stripFormatting: true,
    });
  }
  return message.content ?? "";
}
