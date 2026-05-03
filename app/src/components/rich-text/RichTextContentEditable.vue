<script lang="ts" setup>
/**
 * Canonical TipTap setup for editable prose: `channel` (mentions), `issue` (inline images via attachment upload).
 * Custom behaviour flows through `extraEditorProps` — your handlers run before variant defaults (`chainEditorProps`).
 */
import TiptapCodeBlockCardNodeView from "@/components/channel/TiptapCodeBlockCardNodeView.vue";
import type { MentionSuggestionItem } from "@/components/channel/MentionList.vue";
import MentionList from "@/components/channel/MentionList.vue";
import TiptapMentionNodeView from "@/components/channel/TiptapMentionNodeView.vue";
import { createVueFloatingSuggestion } from "@/core/tiptap";
import { epicStoryLowlight } from "@/core/epic-story-lowlight";
import { useDependency } from "@/core/dependency-injection";
import type { User } from "@/domain/auth";
import { IssueApi } from "@/domain/issues";
import type { RichTextDocument } from "@epicstory/tiptap";
import { normalizeTiptapDoc } from "@epicstory/tiptap";
import {
  createMentionExtensionWithNodeView,
  createPlaceholderExtension,
  createRichTextExtensions,
  mediaExtensions,
  EPICSTORY_RICH_TEXT_EDITABLE,
  EPICSTORY_RICH_TEXT_ISSUE,
} from "@epicstory/tiptap/vue";
import type { Editor, Extensions } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { computed, reactive, watch } from "vue";

export type RichTextEditableVariant = "channel" | "issue";

/** ProseMirror / TipTap chrome merged into `useEditor`; caller props run first (`true` = handled). */
export type RichTextEditorChrome = {
  attributes?: Record<string, unknown>;
  handleKeyDown?: (view: unknown, event: KeyboardEvent) => boolean | void | undefined;
  handlePaste?: (view: unknown, event: ClipboardEvent, slice: unknown) => boolean | void | undefined;
};

/** Caller (`extra`) runs first — return `true` to stop propagation to variant defaults */
function mergeEditorInteraction(
  variant: RichTextEditorChrome,
  caller?: RichTextEditorChrome,
): RichTextEditorChrome {
  const v = variant;
  const c = caller;
  const bcm = v.attributes ?? {};
  const ecm = c?.attributes ?? {};
  const bClass =
    bcm && typeof bcm === "object" && "class" in bcm ? String((bcm as { class?: string }).class ?? "") : "";
  const eClass =
    ecm && typeof ecm === "object" && "class" in ecm ? String((ecm as { class?: string }).class ?? "") : "";
  const mergedClass = [bClass, eClass].filter(Boolean).join(" ");

  const attributes =
    mergedClass !== ""
      ? { ...(bcm as object), ...(ecm as object), class: mergedClass }
      : { ...bcm, ...ecm };

  return {
    ...v,
    ...c,
    attributes,
    handleKeyDown: (view, event) => {
      if (c?.handleKeyDown?.(view, event)) return true;
      return v.handleKeyDown?.(view, event) ?? false;
    },
    handlePaste: (view, event, slice) => {
      if (c?.handlePaste?.(view, event, slice)) return true;
      return v.handlePaste?.(view, event, slice) ?? false;
    },
  };
}

const props = withDefaults(
  defineProps<{
    variant: RichTextEditableVariant;
    document?: RichTextDocument | null;
    syncDocument?: boolean;
    placeholder?: string;
    mentionables?: User[];
    meId?: number | undefined;
    issueId?: number | undefined;
    extraEditorProps?: RichTextEditorChrome;
  }>(),
  {
    syncDocument: false,
    document: null,
    placeholder: "",
    mentionables: () => [],
    issueId: undefined,
    extraEditorProps: undefined,
  },
);

const emit = defineEmits<{
  updated: [{ editor: Editor }];
}>();

const issueApi = useDependency(IssueApi);

const placeholderText = computed(() => {
  if (props.placeholder && props.placeholder !== "") return props.placeholder;
  if (props.variant === "issue") return "Write a description…";
  return "Message…";
});

const mentionContext = reactive<{ meId: number | undefined }>({ meId: props.meId });

watch(
  () => props.meId,
  (v) => {
    mentionContext.meId = v;
  },
);

const mentionablesForSuggestion = computed(() => {
  const me = props.meId;
  const list = props.mentionables ?? [];
  return list.filter((u) => (me != null ? u.id !== me : true));
});

const mentionablesById = computed(() => new Map((props.mentionables ?? []).map((u) => [u.id, u])));

function mentionSuggestionExtension() {
  return createVueFloatingSuggestion({
    items: ({ query }): MentionSuggestionItem[] => {
      const q = (query ?? "").trim().toLowerCase();
      return mentionablesForSuggestion.value
        .filter((u) => (q ? u.name.toLowerCase().includes(q) || String(u.id).startsWith(q) : true))
        .slice(0, 8)
        .map((u) => ({ id: u.id, label: u.name, picture: u.picture }));
    },
    listComponent: MentionList,
    mapProps: ({ items, command, editor }) => ({ items, command, editor }),
    placement: "bottom-start",
    mainAxisOffset: 8,
    zIndex: 80,
    className: "outline-none",
  });
}

function buildExtensions(): Extensions {
  const rich = [
    ...createRichTextExtensions({
      linkOpenOnClick: false,
      lowlight: epicStoryLowlight,
      codeBlockNodeView: TiptapCodeBlockCardNodeView,
      images: props.variant === "issue",
    }),
  ];

  const tail: Extensions = [];
  if (props.variant === "issue") {
    const issueId = props.issueId;
    if (issueId != null) {
      tail.push(
        ...mediaExtensions({
          uploadFile: (file: File) =>
            issueApi.uploadAttachment(issueId, file).then((a) => ({
              src: a.url,
              attachmentId: a.id,
            })),
          allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        }),
      );
    }
  }
  if (props.variant === "channel") {
    tail.push(
      createMentionExtensionWithNodeView(TiptapMentionNodeView, {
        HTMLAttributes: {
          class:
            "mention-chip inline-flex items-center px-0.5 rounded-sm bg-mention-chip text-mention font-medium",
        },
        renderText({ node }: { node: { attrs: { label?: unknown; id?: unknown } } }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        userById: (id: number) => mentionablesById.value.get(id),
        mentionContext,
        suggestion: mentionSuggestionExtension(),
      } as any),
    );
  }
  tail.push(createPlaceholderExtension(() => placeholderText.value));
  return [...rich, ...tail];
}

function resolveEditorProps(): RichTextEditorChrome {
  const cls = props.variant === "issue" ? EPICSTORY_RICH_TEXT_ISSUE : EPICSTORY_RICH_TEXT_EDITABLE;
  return mergeEditorInteraction({ attributes: { class: cls } }, props.extraEditorProps);
}

const editor = useEditor({
  extensions: buildExtensions(),
  content: normalizeTiptapDoc(props.document ?? undefined),
  // Chrome matches TipTap handlers at runtime; package types omit a shared `EditorProps` export we can reference.
  editorProps: resolveEditorProps() as never,
});

watch(
  [() => props.variant, () => props.extraEditorProps],
  () => editor.value?.setOptions({ editorProps: resolveEditorProps() as never }),
  { deep: true },
);

watch(editor, (ed, prev) => {
  if (prev) prev.off("update", notifyUpdated);
  if (!ed) return;
  ed.on("update", notifyUpdated);
}, { immediate: true });

function notifyUpdated() {
  const ed = editor.value;
  if (ed) emit("updated", { editor: ed });
}

watch(
  () => props.document,
  (doc) => {
    if (!props.syncDocument) return;
    editor.value?.commands.setContent(normalizeTiptapDoc(doc ?? undefined), { emitUpdate: false });
  },
);

defineExpose({ editor });
</script>

<template>
  <EditorContent v-if="editor" :editor="editor" />
</template>
