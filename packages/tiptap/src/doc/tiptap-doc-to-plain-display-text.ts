import type { JSONContent } from "@tiptap/core";
import { normalizeTiptapDoc } from "./normalize";
import { stripImageNodesFromDoc } from "./strip-image-nodes";
import { tiptapToPlainText } from "./plain-text";

/**
 * Plain excerpt for sidebars, notifications, and quoted snippets: strips inline images (so URLs do not
 * dominate) then formats like other {@link tiptapToPlainText} `stripFormatting` output.
 * Apply {@link enrichMentionLabels} first when mention resolution is needed.
 */
export function tiptapDocToPlainDisplayText(
  doc: JSONContent | null | undefined,
): string {
  if (doc == null || typeof doc !== "object") return "";
  return tiptapToPlainText(stripImageNodesFromDoc(normalizeTiptapDoc(doc)), {
    stripFormatting: true,
  }).trim();
}
