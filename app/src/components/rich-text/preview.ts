import type { User } from "@/domain/auth";
import type { ComputedRef, InjectionKey } from "vue";

export const EPICSTORY_RICH_TEXT_PREVIEW = "epicstory-rich-text epicstory-rich-text-preview";

/** Context for recursive `JSONContent` preview (mentions chip lookup + “me” id). */
export type RichTextJsonPreviewContext = {
  mentionMeId: ComputedRef<number>;
  lookupUser: (id: number) => User | undefined;
};

export const richTextJsonPreviewKey: InjectionKey<RichTextJsonPreviewContext> = Symbol("richTextJsonPreview");
