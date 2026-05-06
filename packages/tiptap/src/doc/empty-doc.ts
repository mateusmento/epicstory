import type { JSONContent } from "@tiptap/core";

/**
 * Minimal empty TipTap document: a `doc` with no block nodes in `content`.
 * Pair with {@link normalizeTiptapDoc} for API/storage-safe canonical JSON.
 */
export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [],
};
