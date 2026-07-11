<script lang="ts" setup>
import {
  addDescriptionThreadMark,
  applyDescriptionSuggestion,
  clearDescriptionThread,
  createSuggestMode,
  readProposedTextFromEditor,
  type SuggestModeHandle,
} from "@/lib/issues";
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import { useIssueDescriptionThreads } from "@/domain/issues";
import MessageComposerActions from "@/presentationals/messages/MessageComposerActions.vue";
import IssueDescriptionThreadCard from "@/presentationals/issue/IssueDescriptionThreadCard.vue";
import IssueDescriptionThreadComposer from "@/presentationals/issue/IssueDescriptionThreadComposer.vue";
import IssueDescriptionThreadsGutter from "@/presentationals/issue/IssueDescriptionThreadsGutter.vue";
import { RichTextComposer, RichTextInsertContextMenu } from "@/presentationals/rich-text";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import { Separator } from "@/design-system";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi } from "@epicstory/api-client";
import type { DescriptionThreadKind, IDescriptionThread } from "@epicstory/contracts";
import { normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { useDebounceFn } from "@vueuse/core";
import { MessageCirclePlus, SquarePen } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";

const INLINE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const props = withDefaults(
  defineProps<{
    description: JSONContent;
    issueId: number;
    workspaceId?: number;
    disabled?: boolean;
    isSaving?: boolean;
    mention?: MentionComposerView;
    meId?: number;
    meName?: string | null;
    mePicture?: string | null;
  }>(),
  {
    meName: null,
    mePicture: null,
  },
);

const emit = defineEmits<{
  saveDescription: [doc: JSONContent];
  "mention-load-more": [];
}>();

const issueApi = useDependency(IssueApi);
const confirmDialog = useConfirmDialog();
const issueIdRef = computed(() => props.issueId);
const threadsApi = useIssueDescriptionThreads(issueIdRef);

const composerEditor = shallowRef<Editor | null>(null);
const lastSavedJson = ref("");
/** After a local save (e.g. mark cleanup), ignore stale props until the server echo matches. */
const pendingSavedJson = ref<string | null>(null);
const hydrated = ref(false);
const insertMenuOpen = ref(false);
const layoutRoot = ref<HTMLElement | null>(null);

type Draft = {
  kind: DescriptionThreadKind;
  markId: string;
  from: number;
  to: number;
  quoteText: string;
  /** Viewport position for the floating composer (below selection). */
  anchor: { top: number; left: number };
};

const draft = ref<Draft | null>(null);
const suggestModeActive = ref(false);
let suggestMode: SuggestModeHandle | null = null;

async function commitSuggestRecording(payload: {
  markId: string;
  quoteText: string;
  proposedText: string;
  description: JSONContent;
}) {
  if (threadsApi.state.busy) return;
  const descriptionJson = serialize(payload.description);
  if (wouldWipeDescription(descriptionJson)) return;

  const thread = await threadsApi.createThread({
    markId: payload.markId,
    kind: "suggestion",
    quoteText: payload.quoteText || null,
    proposedText: payload.proposedText || null,
    content: plainDoc("Suggested an edit"),
    description: payload.description,
  });

  if (!thread) {
    clearDescriptionThread(composerEditor.value!, payload.markId);
    return;
  }

  lastSavedJson.value = descriptionJson;
  pendingSavedJson.value = descriptionJson;
  threadsApi.activeMarkId = payload.markId;
}

function ensureSuggestMode(ed: Editor) {
  if (suggestMode) return suggestMode;
  suggestMode = createSuggestMode(ed, commitSuggestRecording);
  return suggestMode;
}

function destroySuggestMode() {
  suggestMode?.destroy();
  suggestMode = null;
  suggestModeActive.value = false;
}

onBeforeUnmount(() => {
  destroySuggestMode();
});

const actionHooks = computed(() => ({
  onInsertImage: openInlineImageFilePicker,
}));

const bubbleMenuEnabled = computed(() => !insertMenuOpen.value && !draft.value && !suggestModeActive.value);

const openThreads = computed(() => threadsApi.openThreads);

const bubbleIconBtnClass =
  "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";

function serialize(doc: JSONContent) {
  return JSON.stringify(normalizeTiptapDoc(doc));
}

function isEffectivelyEmptyDoc(serialized: string): boolean {
  try {
    const doc = JSON.parse(serialized) as JSONContent;
    const text = (doc.content ?? [])
      .map((n) => {
        if (n.type === "text") return n.text ?? "";
        return (n.content ?? []).map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("");
      })
      .join("")
      .trim();
    return text.length === 0;
  } catch {
    return false;
  }
}

/** True when saving `next` would wipe a known non-empty description (hydration race). */
function wouldWipeDescription(nextSerialized: string): boolean {
  if (!isEffectivelyEmptyDoc(nextSerialized)) return false;
  if (!isEffectivelyEmptyDoc(lastSavedJson.value)) return true;
  return !isEffectivelyEmptyDoc(serialize(props.description));
}

function plainDoc(text: string): JSONContent {
  return normalizeTiptapDoc({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  });
}

function isOverlayFocus(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-epicstory-bubble-menu]") ||
    target.closest('[role="menu"]') ||
    target.closest("[data-reka-popper-content-wrapper]") ||
    target.closest("[data-description-thread-draft]")
  );
}

function selectionAnchor(ed: Editor, from: number, to: number): { top: number; left: number } {
  try {
    const start = ed.view.coordsAtPos(from);
    const end = ed.view.coordsAtPos(to);
    const left = Math.min(start.left, end.left);
    const bottom = Math.max(start.bottom, end.bottom);
    const pad = 8;
    const maxLeft = window.innerWidth - 360;
    return {
      top: Math.min(bottom + pad, window.innerHeight - 56),
      left: Math.max(8, Math.min(left, maxLeft)),
    };
  } catch {
    return { top: 120, left: 24 };
  }
}

/** Persist current editor doc (after mark cleanup) without losing it to a stale props watch. */
function commitEditorDescription() {
  const ed = composerEditor.value;
  if (!ed || props.disabled) return;
  const next = normalizeTiptapDoc(ed.getJSON());
  const serialized = serialize(next);
  if (wouldWipeDescription(serialized)) return;
  lastSavedJson.value = serialized;
  pendingSavedJson.value = serialized;
  emit("saveDescription", next);
}

watch(
  () => props.description,
  (doc) => {
    const next = serialize(doc);
    const ed = composerEditor.value;
    const editorJson = ed ? serialize(ed.getJSON()) : null;
    const loadingIntoEmpty =
      editorJson != null && isEffectivelyEmptyDoc(editorJson) && !isEffectivelyEmptyDoc(next);

    // Do not clobber in-progress edits or an active selection (bubble open),
    // except when the editor is still empty and the issue doc just arrived.
    if (!loadingIntoEmpty) {
      if (ed?.isFocused) return;
      if (ed && !ed.state.selection.empty) return;
    }

    if (ed && pendingSavedJson.value != null) {
      if (next === pendingSavedJson.value) {
        pendingSavedJson.value = null;
        lastSavedJson.value = next;
        return;
      }
      // Waiting for our save echo — but never block loading real content into an empty editor.
      if (editorJson === pendingSavedJson.value && !loadingIntoEmpty) {
        return;
      }
      pendingSavedJson.value = null;
    }

    lastSavedJson.value = next;
    if (!ed) return;
    if (editorJson !== next) {
      ed.commands.setContent(normalizeTiptapDoc(doc), { emitUpdate: false });
    }
  },
  { deep: true },
);

function onComposerEditorUpdate(ed: Editor | null) {
  composerEditor.value = ed;
  if (!ed || hydrated.value) return;
  // Same as IssueDescriptionEditor: hydrate immediately; prop watch applies the issue doc when it arrives.
  ed.commands.setContent(normalizeTiptapDoc(props.description), { emitUpdate: false });
  lastSavedJson.value = serialize(props.description);
  pendingSavedJson.value = null;
  hydrated.value = true;
}

function flushSave() {
  if (props.disabled || props.isSaving) return;
  // Don't persist mid-draft comment marks or live suggest-mode recordings until committed.
  if (draft.value || suggestModeActive.value) return;
  const instance = composerEditor.value;
  if (!instance) return;
  const next = normalizeTiptapDoc(instance.getJSON());
  const serialized = serialize(next);
  if (serialized === lastSavedJson.value) return;
  if (wouldWipeDescription(serialized)) return;
  lastSavedJson.value = serialized;
  pendingSavedJson.value = serialized;
  emit("saveDescription", next);
}

const scheduleSave = useDebounceFn(() => flushSave(), 500);

function onJsonUpdate() {
  if (props.disabled || !hydrated.value) return;
  scheduleSave();
}

function onBlurSave(e: FocusEvent) {
  if (isOverlayFocus(e.relatedTarget)) return;
  const root = e.currentTarget;
  if (root instanceof Node && e.relatedTarget instanceof Node && root.contains(e.relatedTarget)) {
    return;
  }
  requestAnimationFrame(() => {
    if (isOverlayFocus(document.activeElement)) return;
    const sel = composerEditor.value?.state.selection;
    if (sel && !sel.empty) return;
    flushSave();
  });
}

function onSubmitFlush() {
  flushSave();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && draft.value) {
    e.preventDefault();
    cancelDraft();
    return;
  }
  if (e.key === "Escape" && suggestModeActive.value) {
    e.preventDefault();
    suggestMode?.stop();
    suggestModeActive.value = false;
    return;
  }
  if (e.key !== "Escape" || !composerEditor.value) return;
  e.preventDefault();
  composerEditor.value.commands.setContent(normalizeTiptapDoc(props.description), {
    emitUpdate: false,
  });
  lastSavedJson.value = serialize(props.description);
  pendingSavedJson.value = null;
}

async function insertUploadedImages(files: File[]) {
  const images = files.filter((f) => INLINE_IMAGE_TYPES.includes(f.type));
  const ed = composerEditor.value;
  if (!images.length || !ed) return;
  for (const file of images) {
    try {
      const a = await issueApi.uploadAttachment(props.issueId, file);
      ed.chain()
        .focus()
        .setImage({ src: a.url, attachmentId: a.id } as never)
        .run();
    } catch {
      /* non-blocking */
    }
  }
  scheduleSave();
}

function onRichTextPastedFiles(files: File[]) {
  insertUploadedImages(files);
}

const inlineImageInputRef = ref<HTMLInputElement | null>(null);

function openInlineImageFilePicker() {
  inlineImageInputRef.value?.click();
}

async function onInlineImageFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const raw = input.files ? Array.from(input.files) : [];
  input.value = "";
  await insertUploadedImages(raw);
}

watch(insertMenuOpen, () => {
  const ed = composerEditor.value;
  if (!ed || ed.isDestroyed) return;
  ed.view.dispatch(ed.state.tr);
});

watch(
  () => props.issueId,
  () => {
    hydrated.value = false;
    destroySuggestMode();
    draft.value = null;
    pendingSavedJson.value = null;
  },
);

function onSurfaceClick(e: MouseEvent) {
  const ed = composerEditor.value;
  if (!ed || ed.isDestroyed || props.disabled) return;
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".ProseMirror")) return;
  if (target.closest("[data-description-threads-gutter]")) return;
  ed.chain().focus("end").run();
}

function beginComment() {
  const ed = composerEditor.value;
  if (!ed || ed.state.selection.empty || props.disabled) return;
  if (suggestModeActive.value) {
    suggestMode?.stop();
    suggestModeActive.value = false;
  }
  const { from, to } = ed.state.selection;
  const quoteText = ed.state.doc.textBetween(from, to, " ");
  if (!quoteText.trim()) return;
  draft.value = {
    kind: "comment",
    markId: crypto.randomUUID(),
    from,
    to,
    quoteText,
    anchor: selectionAnchor(ed, from, to),
  };
}

/** Enter Notion-style suggest mode: record later edits; commit when the caret leaves. */
function beginSuggest() {
  const ed = composerEditor.value;
  if (!ed || props.disabled) return;
  draft.value = null;
  ensureSuggestMode(ed).start();
  suggestModeActive.value = true;
}

function cancelDraft() {
  const d = draft.value;
  if (!d) return;
  draft.value = null;
}

async function submitDraft(content: JSONContent) {
  const ed = composerEditor.value;
  const d = draft.value;
  if (!ed || !d || d.kind !== "comment" || threadsApi.state.busy) return;

  addDescriptionThreadMark(ed, d.from, d.to, {
    markId: d.markId,
    kind: "comment",
    role: "anchor",
  });

  const notePlain = tiptapToPlainText(content, { stripFormatting: true }).trim();
  if (!notePlain) return;

  const bodyDoc = normalizeTiptapDoc(content);
  const description = normalizeTiptapDoc(ed.getJSON());
  const descriptionJson = serialize(description);
  if (wouldWipeDescription(descriptionJson)) {
    return;
  }

  const thread = await threadsApi.createThread({
    markId: d.markId,
    kind: "comment",
    quoteText: d.quoteText,
    proposedText: null,
    content: bodyDoc,
    description,
  });

  if (!thread) {
    clearDescriptionThread(ed, d.markId);
    draft.value = null;
    return;
  }

  lastSavedJson.value = descriptionJson;
  pendingSavedJson.value = descriptionJson;
  draft.value = null;
  threadsApi.activeMarkId = d.markId;
}

function removeThreadMark(markId: string) {
  const ed = composerEditor.value;
  if (!ed) return;
  clearDescriptionThread(ed, markId);
}

/** Delete all marked spans for a suggestion and leave only the proposed text. */
function applySuggestionInEditor(markId: string, proposedText: string) {
  const ed = composerEditor.value;
  if (!ed) return;
  applyDescriptionSuggestion(ed, markId, proposedText);
}

async function onResolve(thread: IDescriptionThread) {
  const updated = await threadsApi.updateStatus(thread.id, "resolved");
  if (!updated) return;
  removeThreadMark(thread.markId);
  commitEditorDescription();
}

async function onAccept(thread: IDescriptionThread) {
  const ed = composerEditor.value;
  if (!ed) return;
  const proposed = readProposedTextFromEditor(ed, thread.markId).trim() || thread.proposedText || "";
  applySuggestionInEditor(thread.markId, proposed);
  const description = normalizeTiptapDoc(ed.getJSON());
  lastSavedJson.value = serialize(description);
  pendingSavedJson.value = lastSavedJson.value;
  const updated = await threadsApi.updateStatus(thread.id, "accepted", description);
  if (!updated) return;
}

async function onReject(thread: IDescriptionThread) {
  const updated = await threadsApi.updateStatus(thread.id, "rejected");
  if (!updated) return;
  removeThreadMark(thread.markId);
  commitEditorDescription();
}

async function onReply(thread: IDescriptionThread, content: JSONContent) {
  await threadsApi.reply(thread.id, content);
}

async function onDeleteThread(thread: IDescriptionThread) {
  const confirmed = await confirmDialog.open({
    title: "Delete this thread?",
    description: "The comment or suggestion and all replies will be removed.",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  const markId = await threadsApi.deleteThread(thread.id);
  if (markId) {
    removeThreadMark(markId);
    commitEditorDescription();
  }
}

async function onDeleteMessage(thread: IDescriptionThread, messageId: number) {
  const confirmed = await confirmDialog.open({
    title: "Delete this reply?",
    description: "This reply will be permanently removed.",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  const result = await threadsApi.deleteMessage(thread.id, messageId);
  if (result?.deletedThread && result.markId) {
    removeThreadMark(result.markId);
    commitEditorDescription();
  }
}

function onFocusThread(markId: string) {
  threadsApi.activeMarkId = markId;
  nextTick(() => {
    const root = layoutRoot.value;
    if (!root) return;
    root.querySelectorAll(".epicstory-description-thread[data-mark-id]").forEach((el) => {
      el.removeAttribute("data-active");
      el.classList.remove("is-active");
    });
    root
      .querySelectorAll(`.epicstory-description-thread[data-mark-id="${CSS.escape(markId)}"]`)
      .forEach((el) => {
        el.setAttribute("data-active", "true");
        el.classList.add("is-active");
      });
  });
}

watch(
  () => threadsApi.activeMarkId,
  (id) => {
    if (id) onFocusThread(id);
  },
);
</script>

<template>
  <div class="flex flex-col gap-3 min-w-0" @keydown.capture="onKeydown">
    <div ref="layoutRoot" data-description-layout-root class="relative w-full min-w-0">
      <!-- Gutter outside the main column, to the left (Linear-style overhang). -->
      <aside
        v-if="openThreads.length > 0 || threadsApi.state.loading"
        data-description-threads-gutter
        class="pointer-events-none absolute top-0 right-full z-20 mr-4 hidden h-0 w-[18rem] overflow-visible [overflow-anchor:none] xl:block"
      >
        <div class="pointer-events-auto">
          <p v-if="threadsApi.state.error" class="text-xs text-destructive mb-2">
            {{ threadsApi.state.error }}
          </p>
          <IssueDescriptionThreadsGutter
            :threads="openThreads"
            :editor="composerEditor"
            :layout-root="layoutRoot"
            :active-mark-id="threadsApi.activeMarkId"
            :busy="threadsApi.state.busy"
            :me-name="meName"
            :me-picture="mePicture"
            :mention="mention"
            :me-id="meId"
            :workspace-id="workspaceId"
            @focus="onFocusThread"
            @resolve="onResolve"
            @accept="onAccept"
            @reject="onReject"
            @reply="onReply"
            @delete-thread="onDeleteThread"
            @delete-message="onDeleteMessage"
            @mention-load-more="emit('mention-load-more')"
          />
        </div>
      </aside>

      <div class="min-w-0" @focusout="onBlurSave" @click="onSurfaceClick">
        <RichTextInsertContextMenu
          v-model:open="insertMenuOpen"
          :editor="composerEditor"
          :hooks="actionHooks"
        >
          <div
            class="basis-[8rem] shrink-0 min-w-0 rounded-lg px-2 -mx-2 py-1 h-full [&_.ProseMirror]:min-h-[8rem]"
          >
            <RichTextComposer
              :mention="mention"
              :me-id="meId"
              :workspace-id="workspaceId"
              :bubble-menu-enabled="bubbleMenuEnabled"
              :bubble-menu-boundary="() => layoutRoot"
              suppress-scroll-to-selection
              placeholder="Add a description…"
              @mention-load-more="emit('mention-load-more')"
              @update:editor="onComposerEditorUpdate"
              @update:json="onJsonUpdate"
              @pasted-files="onRichTextPastedFiles"
              @request-insert-image="openInlineImageFilePicker"
              @submit="onSubmitFlush"
            >
              <template #bubbleMenu="{ editor: bubbleEditor }">
                <div
                  data-epicstory-bubble-menu
                  class="flex items-center gap-0.5 z-[90] max-w-[min(100vw-1rem,36rem)] overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                  @mousedown.prevent
                >
                  <MessageComposerActions
                    :editor="bubbleEditor"
                    @insert-inline-image="openInlineImageFilePicker"
                  />
                  <Separator orientation="vertical" class="mx-0.5 h-5" />
                  <button
                    type="button"
                    :class="bubbleIconBtnClass"
                    title="Suggest edit"
                    @click="beginSuggest"
                  >
                    <SquarePen class="size-3.5" stroke-width="2" />
                  </button>
                  <button type="button" :class="bubbleIconBtnClass" title="Add comment" @click="beginComment">
                    <MessageCirclePlus class="size-3.5" stroke-width="2" />
                  </button>
                </div>
              </template>
            </RichTextComposer>
          </div>
        </RichTextInsertContextMenu>
      </div>
    </div>

    <Teleport to="body">
      <IssueDescriptionThreadComposer
        v-if="draft"
        :anchor="draft.anchor"
        :me-name="meName"
        :me-picture="mePicture"
        :busy="threadsApi.state.busy"
        require-body
        autofocus
        placeholder="Add a comment…"
        :mention="mention"
        :me-id="meId"
        :workspace-id="workspaceId"
        @submit="submitDraft"
        @cancel="cancelDraft"
        @mention-load-more="emit('mention-load-more')"
      />
    </Teleport>

    <div v-if="openThreads.length > 0" class="xl:hidden w-full flex flex-col gap-2">
      <IssueDescriptionThreadCard
        v-for="thread in openThreads"
        :key="thread.id"
        :thread="thread"
        :active="threadsApi.activeMarkId === thread.markId"
        :busy="threadsApi.state.busy"
        :me-name="meName"
        :me-picture="mePicture"
        :mention="mention"
        :me-id="meId"
        :workspace-id="workspaceId"
        @focus="onFocusThread(thread.markId)"
        @resolve="onResolve(thread)"
        @accept="onAccept(thread)"
        @reject="onReject(thread)"
        @reply="(content) => onReply(thread, content)"
        @delete-thread="onDeleteThread(thread)"
        @delete-message="(messageId) => onDeleteMessage(thread, messageId)"
        @mention-load-more="emit('mention-load-more')"
      />
    </div>

    <input
      ref="inlineImageInputRef"
      type="file"
      class="sr-only"
      accept="image/png,image/jpeg,image/gif,image/webp"
      multiple
      @change="onInlineImageFilesSelected"
    />
  </div>
</template>
