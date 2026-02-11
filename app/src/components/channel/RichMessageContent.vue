<script lang="ts" setup>
import { EditorContent, useEditor, VueNodeViewRenderer } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { computed, onBeforeUnmount, watch } from "vue";
import { normalizeTiptapDoc } from "@/core/tiptap";
import type { User } from "@/domain/auth";
import TiptapMentionNodeView from "./TiptapMentionNodeView.vue";

const props = defineProps<{
  contentRich: any;
  mentionedUsers?: User[];
}>();

const usersById = computed(() => new Map((props.mentionedUsers ?? []).map((u) => [u.id, u])));

const MentionWithHover = Mention.extend({
  addNodeView() {
    return VueNodeViewRenderer(TiptapMentionNodeView);
  },
});

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
    MentionWithHover.configure({
      HTMLAttributes: {
        class: "mention-chip inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold",
      },
      renderText({ node }: any) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      // Used by `TiptapMentionNodeView.vue` via `props.extension.options.userById`
      userById: (id: number) => usersById.value.get(id),
    } as any),
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
