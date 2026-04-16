import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export type CreateRichTextExtensionsOptions = {
  /** `false` for editable composers; `true` for read-only display (links open on click). */
  linkOpenOnClick: boolean;
};

/**
 * Shared core: StarterKit (without link/underline) + Underline + Link.
 * Does not include Mention or Placeholder — compose those in the app (order: …, Mention, Placeholder).
 */
export function createRichTextExtensions(
  options: CreateRichTextExtensionsOptions,
): AnyExtension[] {
  return [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      openOnClick: options.linkOpenOnClick,
      autolink: true,
      linkOnPaste: true,
    }),
  ];
}

export function createPlaceholderExtension(
  placeholder: string | (() => string),
): AnyExtension {
  return Placeholder.configure(
    typeof placeholder === "function"
      ? { placeholder }
      : { placeholder: () => placeholder },
  );
}
