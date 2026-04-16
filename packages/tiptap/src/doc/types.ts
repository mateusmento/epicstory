/** Minimal TipTap JSON node shape for doc utilities (server-safe). */
export type TiptapJSONNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapJSONNode[];
  marks?: unknown[];
};
