import type { JSONContent } from "@tiptap/core";
import { tiptapDocToPlainDisplayText } from "./tiptap-doc-to-plain-display-text";

export function messageBodyPlainText(message: {
  content: JSONContent;
}): string {
  return tiptapDocToPlainDisplayText(message.content);
}
