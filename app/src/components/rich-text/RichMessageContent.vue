<script lang="ts" setup>
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { epicStoryLowlight } from "@/core/epic-story-lowlight";
import {
  createMentionExtensionWithNodeView,
  createRichTextExtensions,
  EPIC_STORY_READONLY_MESSAGE_CLASS,
} from "@epicstory/tiptap/vue";
import { normalizeTiptapDoc } from "@epicstory/tiptap";
import type { User } from "@/domain/auth";
import TiptapCodeBlockCardNodeView from "./TiptapCodeBlockCardNodeView.vue";
import TiptapMentionNodeView from "./TiptapMentionNodeView.vue";
import { computed, onBeforeUnmount, reactive, watch } from "vue";

const props = defineProps<{
  contentRich: any;
  mentionedUsers?: User[];
  meId: number;
}>();

const usersById = computed(() => new Map((props.mentionedUsers ?? []).map((u) => [u.id, u])));

const mentionContext = reactive({ meId: props.meId });
watch(
  () => props.meId,
  (v) => {
    mentionContext.meId = v;
  },
);

const editor = useEditor({
  editable: false,
  extensions: [
    ...createRichTextExtensions({
      linkOpenOnClick: true,
      lowlight: epicStoryLowlight,
      codeBlockNodeView: TiptapCodeBlockCardNodeView,
    }),
    createMentionExtensionWithNodeView(TiptapMentionNodeView, {
      HTMLAttributes: {
        class:
          "mention-chip inline-flex items-center px-0.5 rounded-sm bg-mention-chip text-mention font-medium",
      },
      renderText({ node }: any) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      userById: (id: number) => usersById.value.get(id),
      mentionContext,
    } as any),
  ],
  content: normalizeTiptapDoc(props.contentRich),
  editorProps: {
    attributes: {
      class: EPIC_STORY_READONLY_MESSAGE_CLASS,
      tabindex: "-1",
    },
    handleDOMEvents: {
      mousedown: (_view, event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("a")) return false;
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
