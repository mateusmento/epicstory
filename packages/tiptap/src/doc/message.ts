import type { TiptapJSONNode } from "./types";
import { normalizeTiptapDoc } from "./normalize";
import { tiptapToPlainText } from "./plain-text";

export function messageBodyPlainText(message: {
  content: string;
  contentRich?: unknown;
}): string {
  if (message.contentRich) {
    return tiptapToPlainText(
      normalizeTiptapDoc(message.contentRich) as TiptapJSONNode,
    );
  }
  return message.content ?? "";
}

export function mergeQuotedMessageIntoDoc(
  quoted: {
    sender: { name: string };
    content: string;
    contentRich?: unknown;
  },
  mainDoc: unknown,
): unknown {
  const excerpt = messageBodyPlainText(quoted).slice(0, 500);
  const quoteNode = {
    type: "blockquote",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "bold" }],
            text: `${quoted.sender.name}: `,
          },
          { type: "text", text: excerpt },
        ],
      },
    ],
  };
  const main = normalizeTiptapDoc(mainDoc) as {
    type?: string;
    content?: unknown[];
  };
  return {
    type: "doc",
    content: [quoteNode, ...(Array.isArray(main.content) ? main.content : [])],
  };
}
