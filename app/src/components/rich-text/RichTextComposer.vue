<script setup lang="ts">
import type { User } from "@/domain/auth";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { computed, onBeforeUnmount, reactive, useSlots, watch } from "vue";
import { createRichTextComposerExtensions, EPICSTORY_RICH_TEXT_COMPOSER } from "./composer";

defineSlots<{
  bubbleMenu?: (props: { editor: Editor }) => unknown;
}>();

const appendBubbleToBody = () => document.body;

const bubbleMenuOptions = {
  strategy: "fixed" as const,
  placement: "top" as const,
  offset: 8,
  flip: true,
  shift: { padding: 8 },
};

const slots = useSlots();

const emit = defineEmits<{
  submit: [];
  "pasted-files": [files: File[]];
  "update:editor": [editor: Editor | null];
}>();

const props = withDefaults(
  defineProps<{
    mentionables?: User[];
    meId?: number;
    placeholder?: string;
  }>(),
  {
    mentionables: () => [],
    placeholder: "",
  },
);

const mentionablesForSuggestion = computed(() => {
  const list = props.mentionables ?? [];
  const meId = props.meId;
  return list.filter((u) => (meId ? u.id !== meId : true));
});

const mentionablesById = computed(() => new Map((props.mentionables ?? []).map((u) => [u.id, u])));

const mentionContext = reactive<{ meId: number | undefined }>({ meId: props.meId });
watch(
  () => props.meId,
  (v) => {
    mentionContext.meId = v;
  },
);

function collectFilesFromClipboard(event: ClipboardEvent): File[] {
  const { clipboardData } = event;
  if (!clipboardData) return [];

  const seen = new Set<string>();
  const pushUnique = (f: File | null, out: File[]) => {
    if (!f || f.size === 0) return;
    // Do not use lastModified in the key: the same paste can appear once in `files` and again via
    // `items[i].getAsFile()` with a 1ms different timestamp (same bytes, two File instances).
    const key = `${f.name}\0${f.size}\0${f.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };

  // Prefer `files` only when present — iterating both `files` and `items` duplicates one image on many browsers.
  if (clipboardData.files?.length) {
    const out: File[] = [];
    for (const f of Array.from(clipboardData.files)) pushUnique(f, out);
    return out;
  }

  const out: File[] = [];
  const items = clipboardData.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      pushUnique(it.getAsFile(), out);
    }
  }
  return out;
}

const editor = useEditor({
  extensions: createRichTextComposerExtensions({
    getPlaceholder: () => props.placeholder ?? "",
    mentionContext,
    mentionablesById,
    mentionablesForSuggestion,
  }),
  content: "",
  editorProps: {
    attributes: {
      class: EPICSTORY_RICH_TEXT_COMPOSER,
    },
    handleKeyDown: (_, event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        emit("submit");
        return true;
      }
      return false;
    },
    handlePaste: (_view, event) => {
      const files = collectFilesFromClipboard(event);
      if (files.length === 0) return false;
      event.preventDefault();
      emit("pasted-files", files);
      return true;
    },
  },
});

watch(
  editor,
  (editor) => {
    emit("update:editor", editor ?? null);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

defineExpose({
  editor,
});
</script>

<template>
  <div class="min-h-0 min-w-0">
    <EditorContent v-if="editor" :editor="editor" />
    <!-- Optional bubble toolbar (e.g. format actions on selection); append to body to escape overflow-hidden ancestors. -->
    <BubbleMenu
      v-if="editor && slots.bubbleMenu"
      plugin-key="epicstoryRichTextBubbleMenu"
      :editor="editor"
      :append-to="appendBubbleToBody"
      :options="bubbleMenuOptions"
    >
      <slot name="bubbleMenu" :editor="editor" />
    </BubbleMenu>
  </div>
</template>
