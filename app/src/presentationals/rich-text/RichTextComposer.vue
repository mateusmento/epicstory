<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import type { Editor } from "@tiptap/core";
import { isTextSelection } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { IssueApi } from "@epicstory/api-client";
import type { IIssue } from "@epicstory/contracts";
import { computed, nextTick, onBeforeUnmount, reactive, ref, useSlots, watch } from "vue";
import { createRichTextComposerExtensions, EPICSTORY_RICH_TEXT_COMPOSER } from "./composer";
import InsertIssueDialog from "./InsertIssueDialog.vue";
import { bumpActiveMentionSuggestionQuery } from "./mention-suggestion-bump";
import type { MentionComposerView } from "./mention.types";
import { issueNodeDocAttrs, parseEpicstoryIssueUrl } from "./parse-issue-url";

defineSlots<{
  bubbleMenu?: (props: { editor: Editor }) => unknown;
}>();

const slots = useSlots();

const emit = defineEmits<{
  submit: [];
  /** Clipboard paste or editor drop of files → shell staging upload (includes images). */
  "pasted-files": [files: File[]];
  "update:editor": [editor: Editor | null];
  "update:json": [json: Record<string, unknown>];
  "mention-load-more": [];
  "request-insert-image": [];
}>();

const props = withDefaults(
  defineProps<{
    mention?: MentionComposerView;
    meId?: number;
    placeholder?: string;
    /** When set, `/Issue` and paste-URL unfurl can resolve workspace issues. */
    workspaceId?: number;
    /** When false, the format bubble stays hidden (e.g. insert context menu is open). */
    bubbleMenuEnabled?: boolean;
    /**
     * When true, ProseMirror will not scroll the caret into view.
     * Needed on long issue pages so focusing the description does not fight page scroll.
     */
    suppressScrollToSelection?: boolean;
    /**
     * Keep the format bubble inside this box (Floating UI boundary).
     * Use the description column so the menu does not cover the threads gutter.
     */
    bubbleMenuBoundary?: HTMLElement | null | (() => HTMLElement | null);
  }>(),
  {
    placeholder: "",
    bubbleMenuEnabled: true,
    suppressScrollToSelection: false,
    bubbleMenuBoundary: null,
  },
);

const appendBubbleToBody = () => document.body;

function resolveBubbleBoundary(): Element | undefined {
  const b = props.bubbleMenuBoundary;
  if (!b) return undefined;
  return typeof b === "function" ? (b() ?? undefined) : b;
}

/** Floating UI options; shift/flip re-read boundary each update (Derivable). */
const bubbleMenuOptions = {
  strategy: "fixed" as const,
  placement: "top" as const,
  offset: 8,
  flip: () => {
    const boundary = resolveBubbleBoundary();
    return boundary ? { padding: 8, boundary } : { padding: 8 };
  },
  shift: () => {
    const boundary = resolveBubbleBoundary();
    return boundary ? { padding: 8, boundary } : { padding: 8 };
  },
};

/** Focus is in the bubble chrome or a portaled menu opened from it. */
function isRichTextOverlayFocus(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-epicstory-bubble-menu]") ||
    target.closest('[role="menu"]') ||
    target.closest("[data-reka-popper-content-wrapper]")
  );
}

function shouldShowBubbleMenu({
  editor: ed,
  view,
  state,
  from,
  to,
}: {
  editor: Editor;
  view: { hasFocus: () => boolean };
  state: {
    doc: { textBetween: (a: number, b: number) => string };
    selection: { empty: boolean };
  };
  from: number;
  to: number;
}) {
  if (!props.bubbleMenuEnabled || !ed.isEditable) return false;

  const { empty } = state.selection;
  const isEmptyTextBlock =
    !state.doc.textBetween(from, to).length && isTextSelection(state.selection as never);
  if (empty || isEmptyTextBlock) return false;

  const hasEditorFocus = view.hasFocus() || isRichTextOverlayFocus(document.activeElement);
  return hasEditorFocus;
}

const issueApi = useDependency(IssueApi);
const insertIssueOpen = ref(false);

const mentionablesForSuggestion = computed(() => {
  const list = props.mention?.mentionables ?? [];
  const meId = props.meId;
  return list.filter((u) => (meId ? u.id !== meId : true));
});

const mentionablesById = computed(() => new Map((props.mention?.mentionables ?? []).map((u) => [u.id, u])));

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
    const key = `${f.name}\0${f.size}\0${f.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };

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

function insertIssueIntoEditor(issue: IIssue) {
  const ed = editor.value;
  if (!ed) return;
  ed.chain()
    .focus()
    .insertContent([
      {
        type: "issue",
        attrs: issueNodeDocAttrs(issue),
      },
      { type: "text", text: " " },
    ])
    .run();
}

async function tryPasteIssueUrl(plainText: string): Promise<boolean> {
  const text = plainText.trim();
  if (!text || text.includes("\n")) return false;
  const parsed = parseEpicstoryIssueUrl(text);
  if (!parsed) return false;
  try {
    const issue = await issueApi.fetchIssue(parsed.issueId);
    if (issue.workspaceId !== parsed.workspaceId || issue.projectId !== parsed.projectId) {
      return false;
    }
    insertIssueIntoEditor(issue);
    return true;
  } catch {
    return false;
  }
}

const editor = useEditor({
  extensions: createRichTextComposerExtensions({
    getPlaceholder: () => props.placeholder ?? "",
    mentionContext,
    mentionablesById,
    mentionablesForSuggestion,
    getOnMentionListReachedBottom: () =>
      props.mention?.list.hasMore ? () => emit("mention-load-more") : undefined,
    getMentionListHasMore: () => props.mention?.list.hasMore ?? false,
    getMentionListLoadingMore: () => props.mention?.list.loadingMore ?? false,
    getOnlineUserIds: () => props.mention?.onlineUserIds,
    onRequestInsertIssue: () => {
      if (props.workspaceId != null && Number.isFinite(props.workspaceId)) {
        insertIssueOpen.value = true;
      }
    },
    onRequestInsertImage: () => emit("request-insert-image"),
  }),
  content: "",
  onUpdate: ({ editor: ed }) => {
    emit("update:json", ed.getJSON());
  },
  editorProps: {
    attributes: {
      class: EPICSTORY_RICH_TEXT_COMPOSER,
    },
    handleScrollToSelection: () => props.suppressScrollToSelection,
    handleKeyDown: (_, event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        emit("submit");
        return true;
      }
      return false;
    },
    handlePaste: (_view, event) => {
      const files = collectFilesFromClipboard(event);
      if (files.length > 0) {
        event.preventDefault();
        emit("pasted-files", files);
        return true;
      }
      const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
      if (text && !text.includes("\n") && parseEpicstoryIssueUrl(text)) {
        event.preventDefault();
        tryPasteIssueUrl(text).then((ok) => {
          if (!ok && editor.value) {
            editor.value.chain().focus().insertContent(text).run();
          }
        });
        return true;
      }
      return false;
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
  () => props.mention?.list.items.length ?? 0,
  (len, prevLen) => {
    if (!props.mention?.list.hasMore) return;
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
  insertIssue: insertIssueIntoEditor,
  openInsertIssue: () => {
    insertIssueOpen.value = true;
  },
});
</script>

<template>
  <div class="min-h-0 min-w-0 h-full">
    <EditorContent
      v-if="editor"
      :editor="editor"
      class="h-full min-h-0 [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-0"
    />
    <BubbleMenu
      v-if="editor && slots.bubbleMenu"
      plugin-key="epicstoryRichTextBubbleMenu"
      :editor="editor"
      :append-to="appendBubbleToBody"
      :options="bubbleMenuOptions"
      :should-show="shouldShowBubbleMenu"
    >
      <slot name="bubbleMenu" :editor="editor" />
    </BubbleMenu>
    <InsertIssueDialog
      v-if="props.workspaceId != null"
      v-model:open="insertIssueOpen"
      :workspace-id="props.workspaceId"
      @select="insertIssueIntoEditor"
    />
  </div>
</template>
