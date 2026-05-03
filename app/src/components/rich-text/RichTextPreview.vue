<script lang="ts" setup>
/**
 * Read-only rich text: `@tiptap/html` + unified preview class (schema matches `RichTextContentEditable`).
 */
import { epicStoryLowlight } from "@/core/epic-story-lowlight";
import { richTextDocumentToHtml, type RichTextDocument } from "@epicstory/tiptap";
import { createRichTextHtmlExtensions, EPICSTORY_RICH_TEXT_PREVIEW } from "@epicstory/tiptap/vue";
import Mention from "@tiptap/extension-mention";
import type { AnyExtension } from "@tiptap/core";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    content: RichTextDocument | null | undefined;
    /** When true, links open in a new tab via `rel` / `target` (default). Set false to match stricter embed rules. */
    linkOpenOnClick?: boolean;
  }>(),
  { linkOpenOnClick: true },
);

function buildPreviewExtensions(linkOpenOnClick: boolean): AnyExtension[] {
  return [
    ...createRichTextHtmlExtensions({
      linkOpenOnClick,
      lowlight: epicStoryLowlight,
    }),
    Mention.configure({
      HTMLAttributes: {
        class:
          "mention-chip inline-flex items-center px-0.5 rounded-sm bg-mention-chip text-mention font-medium",
      },
    }),
  ];
}

const extensions = computed(() => buildPreviewExtensions(props.linkOpenOnClick));

const html = computed(() => richTextDocumentToHtml(props.content ?? undefined, extensions.value));
</script>

<template>
  <div :class="EPICSTORY_RICH_TEXT_PREVIEW" v-html="html" />
</template>
