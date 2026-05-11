import type { JSONContent } from "@tiptap/core";

export type RichTextPreviewImageItem = { url: string; caption: string };

/** Doc-order list of image URLs for preview lightbox carousel. */
export function collectRichTextPreviewImages(
  doc: JSONContent | null | undefined,
): RichTextPreviewImageItem[] {
  const out: RichTextPreviewImageItem[] = [];

  function walk(node: JSONContent | undefined): void {
    if (!node) return;
    if (node.type === "image") {
      const src = String(node.attrs?.src ?? "").trim();
      if (src) {
        const alt = String(node.attrs?.alt ?? "").trim();
        const title =
          node.attrs?.title != null ? String(node.attrs.title).trim() : "";
        const caption = alt || title;
        out.push({ url: src, caption });
      }
    }
    const children = node.content;
    if (Array.isArray(children)) {
      for (const c of children) walk(c);
    }
  }

  walk(doc ?? undefined);
  return out;
}
