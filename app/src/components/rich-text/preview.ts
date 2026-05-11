import type { User } from "@/domain/auth";
import type { ComputedRef, InjectionKey } from "vue";
import type { RichTextPreviewImageItem } from "./collect-preview-images";

export const EPICSTORY_RICH_TEXT_PREVIEW = "epicstory-rich-text epicstory-rich-text-preview";

/** Context for recursive `JSONContent` preview (mentions chip lookup + “me” id). */
export type RichTextJsonPreviewContext = {
  mentionMeId: ComputedRef<number>;
  lookupUser: (id: number) => User | undefined;
  /** Inline images in doc order (for PhotoSwipe carousel). */
  previewImageGallery: ComputedRef<RichTextPreviewImageItem[]>;
};

export const richTextJsonPreviewKey: InjectionKey<RichTextJsonPreviewContext> = Symbol("richTextJsonPreview");
