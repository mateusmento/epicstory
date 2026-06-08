<script setup lang="ts">
import type { IUser } from "@epicstory/contracts";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, useSlots, watch } from "vue";
import { createRichTextComposerExtensions, EPICSTORY_RICH_TEXT_COMPOSER } from "./composer";
import { bumpActiveMentionSuggestionQuery } from "./mention-suggestion-bump";

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
  /** Clipboard paste or editor drop of files → shell staging upload (includes images). */
  "pasted-files": [files: File[]];
  "update:editor": [editor: Editor | null];
}>();

const props = withDefaults(
  defineProps<{
    mentionables?: IUser[];
    meId?: number;
    placeholder?: string;
    /** Workspace-style pagination: scroll list to bottom → load more mention candidates. */
    onMentionListReachedBottom?: () => void | Promise<void>;
    mentionListHasMore?: boolean;
    mentionListLoadingMore?: boolean;
    isUserOnline?: (userId: number) => boolean;
  }>(),
  {
    mentionables: () => [],
    placeholder: "",
    mentionListHasMore: true,
    mentionListLoadingMore: false,
  },
);

const mentionListHasMoreRef = ref(props.mentionListHasMore);
const mentionListLoadingMoreRef = ref(props.mentionListLoadingMore);
const onMentionListReachedBottomRef = shallowRef(props.onMentionListReachedBottom);
const isUserOnlineRef = shallowRef(props.isUserOnline);

watch(
  () => props.mentionListHasMore,
  (v) => {
    mentionListHasMoreRef.value = v ?? true;
  },
  { immediate: true },
);

watch(
  () => props.mentionListLoadingMore,
  (v) => {
    mentionListLoadingMoreRef.value = v ?? false;
  },
  { immediate: true },
);

watch(
  () => props.onMentionListReachedBottom,
  (fn) => {
    onMentionListReachedBottomRef.value = fn;
  },
  { immediate: true },
);

watch(
  () => props.isUserOnline,
  (fn) => {
    isUserOnlineRef.value = fn;
  },
  { immediate: true },
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
    getOnMentionListReachedBottom: () => onMentionListReachedBottomRef.value,
    getMentionListHasMore: () => mentionListHasMoreRef.value,
    getMentionListLoadingMore: () => mentionListLoadingMoreRef.value,
    getIsUserOnline: () => isUserOnlineRef.value,
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
    handleDrop: (_view, event, _slice, moved) => {
      if (moved) return false;
      const dt = event.dataTransfer;
      if (!dt?.files?.length) return false;
      const files = Array.from(dt.files).filter((f) => f.size > 0);
      if (!files.length) return false;
      event.preventDefault();
      emit("pasted-files", files);
      return true;
    },
  },
});

watch(
  () => props.mentionables?.length ?? 0,
  (len, prevLen) => {
    if (onMentionListReachedBottomRef.value == null) return;
    if (prevLen === undefined || len <= prevLen) return;
    void nextTick(() => bumpActiveMentionSuggestionQuery(editor.value ?? undefined));
  },
);

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
