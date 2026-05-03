/** Persisted TipTap/ProseMirror JSON document (messages, replies, issues, comments). */
export type RichTextDocument = Record<string, unknown>;

/** Minimal TipTap JSON node shape for doc utilities (server-safe). */
export type TiptapJSONNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapJSONNode[];
  marks?: unknown[];
};

/** Empty prose mirror doc (`{ "type": "doc", "content": [] }`). */
export const EMPTY_RICH_TEXT_DOCUMENT: RichTextDocument = {
  type: "doc",
  content: [],
};
