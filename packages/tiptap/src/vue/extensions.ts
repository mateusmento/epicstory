import type { AnyExtension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { FileHandler } from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import type { MentionOptions } from "@tiptap/extension-mention";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { EpicBlockquote } from "./epic-blockquote";
import { EpicInlineCode } from "./epic-inline-code";
import type { createLowlight } from "lowlight";
import type { Component } from "vue";

type CreateRichTextExtensionsBase = {
  /** `false` for editable composers; `true` for read-only display (links open on click). */
  linkOpenOnClick: boolean;
  /**
   * When true (default), append {@link TaskList} + {@link TaskItem} for checkbox lists.
   */
  taskLists?: boolean;
  /**
   * When true (default), append {@link TableKit} for tables.
   */
  tables?: boolean;
  /**
   * When true (default), register {@link Image} for inline image nodes (no upload — use {@link mediaExtensions} for that).
   */
  images?: boolean;
};

/**
 * With `lowlight`, pass a Vue node view for the code block card (see app `TiptapCodeBlockCardNodeView.vue`).
 */
export type CreateRichTextExtensionsOptions =
  | (CreateRichTextExtensionsBase & {
      lowlight?: undefined;
      codeBlockNodeView?: undefined;
    })
  | (CreateRichTextExtensionsBase & {
      lowlight: LowlightInstance;
      codeBlockNodeView: Component;
    });

/** Checkbox lists; compose after {@link createRichTextExtensions} if you need a custom `createRichTextExtensions` without tables/code. */
export function taskListExtensions(options?: {
  nested?: boolean;
}): AnyExtension[] {
  const nested = options?.nested ?? true;
  return [TaskList, TaskItem.configure({ nested })];
}

/** Table editing (insert row/column, etc.); uses {@link TableKit} from `@tiptap/extension-table`. */
export function tableExtensions(options?: {
  resizable?: boolean;
}): AnyExtension[] {
  return [
    TableKit.configure({
      table: { resizable: options?.resizable ?? true },
    }),
  ];
}

export type MediaExtensionsOptions = {
  /** Returns a public URL for the uploaded file (e.g. S3 `Location`). */
  uploadFile: (file: File) => Promise<string>;
  /** When set, only these MIME types are accepted for paste/drop. */
  allowedMimeTypes?: string[];
};

function imageExtension(): AnyExtension {
  return Image.configure({
    allowBase64: false,
    HTMLAttributes: { class: "max-w-full h-auto rounded-md" },
  });
}

/** Paste/drop uploads via {@link FileHandler}. Requires {@link Image} from {@link createRichTextExtensions} (`images: true`). */
export function mediaExtensions(
  options: MediaExtensionsOptions,
): AnyExtension[] {
  const { uploadFile, allowedMimeTypes } = options;
  return [
    FileHandler.configure({
      allowedMimeTypes,
      onPaste: (editor, files) => {
        (async () => {
          for (const file of files) {
            const src = await uploadFile(file);
            editor.chain().focus().setImage({ src }).run();
          }
        })();
      },
      onDrop: (editor, files, pos) => {
        (async () => {
          for (const file of files) {
            const src = await uploadFile(file);
            editor
              .chain()
              .focus()
              .insertContentAt(pos, { type: "image", attrs: { src } })
              .run();
          }
        })();
      },
    }),
  ];
}

/** Lowlight v3 does not export a named `Lowlight` type; use the instance return type. */
export type LowlightInstance = ReturnType<typeof createLowlight>;

/**
 * Code blocks with a light gray header (language label + collapse) and dark body.
 * Pass a Vue component (e.g. app-local `TiptapCodeBlockCardNodeView.vue`) like {@link createMentionExtensionWithNodeView}.
 */
export function codeBlockLowlightCardExtension(
  lowlight: LowlightInstance,
  nodeView: Component,
): AnyExtension {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return VueNodeViewRenderer(nodeView);
    },
  }).configure({ lowlight });
}

/**
 * Mention + Vue node view; callers pass full Mention options (including optional `suggestion` from the app).
 */
export function createMentionExtensionWithNodeView(
  mentionNodeView: Component,
  options: MentionOptions & { userById?: (id: number) => unknown },
): AnyExtension {
  return Mention.extend({
    addNodeView() {
      return VueNodeViewRenderer(mentionNodeView);
    },
  }).configure(options as MentionOptions);
}

/**
 * Shared core: StarterKit (without link/underline) + Underline + Link.
 * Does not include Mention or Placeholder — compose those in the app (order: …, Mention, Placeholder).
 */
export function createRichTextExtensions(
  options: CreateRichTextExtensionsOptions,
): AnyExtension[] {
  const useHl = options.lowlight != null;
  const taskLists = options.taskLists !== false;
  const tables = options.tables !== false;
  const images = options.images !== false;
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      link: false,
      underline: false,
      ...(useHl ? { codeBlock: false } : {}),
      blockquote: false,
      code: false,
    }),
    EpicInlineCode.configure({
      HTMLAttributes: { class: "epic-inline-code" },
    }),
    EpicBlockquote,
    Underline,
    Link.configure({
      openOnClick: options.linkOpenOnClick,
      autolink: true,
      linkOnPaste: true,
    }),
  ];
  if (useHl && options.codeBlockNodeView && options.lowlight) {
    extensions.push(
      codeBlockLowlightCardExtension(
        options.lowlight,
        options.codeBlockNodeView,
      ),
    );
  }
  if (taskLists) {
    extensions.push(...taskListExtensions());
  }
  if (tables) {
    extensions.push(...tableExtensions());
  }
  if (images) {
    extensions.push(imageExtension());
  }
  return extensions;
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
