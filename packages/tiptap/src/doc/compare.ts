import { normalizeTiptapDoc } from "./normalize";

/** Stable JSON string for equality / activity diffs after normalization. */
export function serializeRichTextForCompare(doc: unknown): string {
  return JSON.stringify(normalizeTiptapDoc(doc));
}

export function isRichTextEqual(a: unknown, b: unknown): boolean {
  return serializeRichTextForCompare(a) === serializeRichTextForCompare(b);
}
