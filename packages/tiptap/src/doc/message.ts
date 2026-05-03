import type { TiptapJSONNode } from "./types";
import { normalizeTiptapDoc } from "./normalize";
import { tiptapToPlainText } from "./plain-text";
import { legacyPlainTextToRichTextDocument } from "./legacy-plain";

/** Max top-level blocks copied from the quoted rich doc (avoids huge payloads). */
const QUOTE_RICH_MAX_BLOCKS = 24;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function quotedBodyBlocks(quoted: { content: unknown }): TiptapJSONNode[] {
  if (quoted.content && typeof quoted.content === "object") {
    const norm = normalizeTiptapDoc(quoted.content) as {
      content?: TiptapJSONNode[];
    };
    const blocks = Array.isArray(norm.content)
      ? norm.content.slice(0, QUOTE_RICH_MAX_BLOCKS).map((b) => cloneJson(b))
      : [];
    if (blocks.length > 0) return blocks;
  }
  const excerpt = messageBodyPlainText(quoted).slice(0, 500);
  if (!excerpt) {
    return [{ type: "paragraph", content: [] }];
  }
  const fallback = legacyPlainTextToRichTextDocument(excerpt) as {
    content?: TiptapJSONNode[];
  };
  return Array.isArray(fallback.content) && fallback.content.length > 0
    ? fallback.content
    : [{ type: "paragraph", content: [{ type: "text", text: excerpt }] }];
}

export function messageBodyPlainText(message: { content: unknown }): string {
  if (!message.content || typeof message.content !== "object") {
    return "";
  }
  return tiptapToPlainText(
    normalizeTiptapDoc(message.content) as TiptapJSONNode,
    { stripFormatting: true },
  );
}

/**
 * @deprecated Prefer persisting `quotedMessageId` on the message/reply and rendering
 * the referenced message in the UI. Kept for reading legacy payloads that embedded a
 * synthetic blockquote in the prose doc.
 */
export function mergeQuotedMessageIntoDoc(
  quoted: {
    sender: { name: string };
    content: unknown;
  },
  mainDoc: unknown,
): unknown {
  const bodyBlocks = quotedBodyBlocks(quoted);
  const quoteNode = {
    type: "blockquote",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "bold" }],
            text: `${quoted.sender.name}`,
          },
          { type: "text", text: " · " },
        ],
      },
      ...bodyBlocks,
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
