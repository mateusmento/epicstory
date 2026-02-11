<script lang="ts" setup>
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { onBeforeUnmount, watch } from "vue";

const props = defineProps<{
  contentRich: any;
}>();

function normalizeTiptapDoc(doc: any): any {
  if (!doc || typeof doc !== "object") return doc;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return doc;

  function isEmptyTrailingParagraph(node: any) {
    if (!node || node.type !== "paragraph") return false;
    if (!node.content || node.content.length === 0) return true;
    return node.content.every((c: any) => c?.type === "hardBreak");
  }

  const next = { ...doc, content: [...doc.content] };
  while (next.content.length > 0 && isEmptyTrailingParagraph(next.content[next.content.length - 1])) {
    next.content.pop();
  }
  return next;
}

const editor = useEditor({
  editable: false,
  extensions: [
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: true,
      autolink: true,
      linkOnPaste: true,
    }),
    Mention.configure({
      HTMLAttributes: {
        class: "mention-chip inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold",
      },
      renderText({ node }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
    }),
  ],
  content: normalizeTiptapDoc(props.contentRich),
  editorProps: {
    attributes: {
      class:
        "outline-none text-[calc(1rem-1px)] font-lato leading-relaxed [&_p]:my-1 [&_li>p]:my-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_a]:text-blue-600 [&_a]:underline",
      tabindex: "-1",
    },
    handleDOMEvents: {
      mousedown: (_view, event) => {
        const target = event.target as HTMLElement | null;
        // allow normal link clicks
        if (target?.closest("a")) return false;
        // block ProseMirror focus/selection => prevents caret/trailingBreak showing up
        return true;
      },
    },
  },
});

watch(
  () => props.contentRich,
  (next) => {
    if (!editor.value) return;
    editor.value.commands.setContent(normalizeTiptapDoc(next) ?? "");
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <EditorContent v-if="editor" :editor="editor" />
</template>
