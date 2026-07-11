<script lang="ts" setup>
import MessageComposerActions from "@/presentationals/messages/MessageComposerActions.vue";
import { RichTextComposer } from "@/presentationals/rich-text";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import { UserAvatar } from "@/presentationals/user";
import { normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { ArrowUp } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

const props = withDefaults(
  defineProps<{
    /** Viewport coordinates for the selection anchor (under the selection). */
    anchor: { top: number; left: number };
    meName?: string | null;
    mePicture?: string | null;
    placeholder?: string;
    busy?: boolean;
    /** When true, require non-empty body (comments). Suggestions may allow empty note. */
    requireBody?: boolean;
    /** Autofocus the rich composer (comments). Suggestions keep focus in the description. */
    autofocus?: boolean;
    mention?: MentionComposerView;
    meId?: number;
    workspaceId?: number;
  }>(),
  {
    meName: null,
    mePicture: null,
    requireBody: true,
    autofocus: true,
  },
);

const emit = defineEmits<{
  submit: [content: JSONContent];
  cancel: [];
  "mention-load-more": [];
}>();

const rootRef = ref<HTMLElement | null>(null);
const noteEditor = shallowRef<Editor | null>(null);
const noteJson = ref<JSONContent | null>(null);

const canSubmit = computed(() => {
  if (props.busy) return false;
  const doc = noteJson.value;
  if (!doc) return !props.requireBody;
  const plain = tiptapToPlainText(doc, { stripFormatting: true }).trim();
  if (props.requireBody) return plain.length > 0;
  return true;
});

function onEditorUpdate(ed: Editor | null) {
  noteEditor.value = ed;
  if (ed && props.autofocus) {
    nextTick(() => {
      if (!ed.isDestroyed) ed.commands.focus("end");
    });
  }
}

function onJsonUpdate(json: Record<string, unknown>) {
  noteJson.value = json as JSONContent;
}

function onSubmit() {
  if (!canSubmit.value) return;
  const doc = noteJson.value
    ? normalizeTiptapDoc(noteJson.value)
    : normalizeTiptapDoc({ type: "doc", content: [{ type: "paragraph", content: [] }] });
  if (props.requireBody && !tiptapToPlainText(doc, { stripFormatting: true }).trim()) return;
  emit("submit", doc);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    emit("cancel");
  }
}

function onDocPointerDown(e: PointerEvent) {
  const el = rootRef.value;
  if (!el) return;
  if (e.target instanceof Node && el.contains(e.target)) return;
  // Keep open while interacting with the editor suggestion marks; Escape cancels.
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocPointerDown, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointerDown, true);
});

watch(
  () => props.anchor,
  () => {
    /* style bound reactively */
  },
);
</script>

<template>
  <div
    ref="rootRef"
    data-description-thread-draft
    class="fixed z-[120] flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:border-border dark:bg-background"
    :style="{
      top: `${anchor.top}px`,
      left: `${anchor.left}px`,
    }"
    @keydown="onKeydown"
  >
    <div class="flex gap-2 px-3 pt-3 pb-2">
      <UserAvatar
        v-if="meName"
        :name="meName"
        :picture="mePicture"
        size="sm"
        class="mt-0.5 size-6 shrink-0"
      />
      <div v-else class="mt-0.5 size-6 shrink-0 rounded-full bg-[#ececec] dark:bg-muted" aria-hidden="true" />

      <div
        class="min-w-0 flex-1 [&_.ProseMirror]:min-h-[4.5rem] [&_.ProseMirror]:text-[13px] [&_.ProseMirror]:leading-relaxed"
      >
        <RichTextComposer
          :mention="mention"
          :me-id="meId"
          :workspace-id="workspaceId"
          :placeholder="placeholder ?? 'Add a comment…'"
          @mention-load-more="emit('mention-load-more')"
          @update:editor="onEditorUpdate"
          @update:json="onJsonUpdate"
          @submit="onSubmit"
        >
          <template #bubbleMenu="{ editor: bubbleEditor }">
            <div
              data-epicstory-bubble-menu
              class="flex items-center gap-0.5 z-[90] max-w-[min(100vw-1rem,22rem)] overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
              @mousedown.prevent
            >
              <MessageComposerActions :editor="bubbleEditor" />
            </div>
          </template>
        </RichTextComposer>
      </div>
    </div>

    <div class="flex items-center justify-end border-t border-[#eee] px-3 py-2 dark:border-border/60">
      <button
        type="button"
        class="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
        :disabled="!canSubmit"
        title="Send"
        @click="onSubmit"
      >
        <ArrowUp class="size-3.5" stroke-width="2.25" />
      </button>
    </div>
  </div>
</template>
