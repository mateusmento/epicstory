import type { TiptapJSONNode } from "./types";
import { normalizeTiptapDoc } from "./normalize";
import { tiptapToPlainText } from "./plain-text";

/** Max top-level blocks copied from the quoted rich doc (avoids huge payloads). */
const QUOTE_RICH_MAX_BLOCKS = 24;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Top-level blocks from the quoted message's rich doc, or a single paragraph fallback.
 */
function quotedBodyBlocks(quoted: {
  content: string;
  contentRich?: unknown;
}): TiptapJSONNode[] {
  if (quoted.contentRich) {
    const norm = normalizeTiptapDoc(quoted.contentRich) as {
      content?: TiptapJSONNode[];
    };
    const blocks = Array.isArray(norm.content)
      ? norm.content.slice(0, QUOTE_RICH_MAX_BLOCKS).map((b) => cloneJson(b))
      : [];
    if (blocks.length > 0) return blocks;
  }
  const excerpt = messageBodyPlainText(quoted).slice(0, 500);
  return [
    {
      type: "paragraph",
      content: excerpt ? [{ type: "text", text: excerpt }] : [],
    },
  ];
}

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

/**
 * @deprecated Prefer persisting `quotedMessageId` on the message/reply and rendering
 * the referenced message in the UI. Kept for reading legacy messages that embedded a
 * synthetic blockquote in `contentRich`.
 */
export function mergeQuotedMessageIntoDoc(
  quoted: {
    sender: { name: string };
    content: string;
    contentRich?: unknown;
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
