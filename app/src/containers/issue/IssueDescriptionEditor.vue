<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import MessageComposerActions from "@/presentationals/messages/MessageComposerActions.vue";
import { RichTextComposer, RichTextInsertContextMenu } from "@/presentationals/rich-text";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import { IssueApi } from "@epicstory/api-client";
import { normalizeTiptapDoc } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { useDebounceFn } from "@vueuse/core";
import { computed, ref, shallowRef, watch } from "vue";

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
  }>(),
  {},
);

const emit = defineEmits<{
  saveDescription: [doc: JSONContent];
  "mention-load-more": [];
}>();

const issueApi = useDependency(IssueApi);
const composerEditor = shallowRef<Editor | null>(null);
const lastSavedJson = ref("");
const hydrated = ref(false);
const insertMenuOpen = ref(false);

const actionHooks = computed(() => ({
  onInsertImage: openInlineImageFilePicker,
}));

const bubbleMenuEnabled = computed(() => !insertMenuOpen.value);

function serialize(doc: JSONContent) {
  return JSON.stringify(normalizeTiptapDoc(doc));
}

function isOverlayFocus(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-epicstory-bubble-menu]") ||
    target.closest('[role="menu"]') ||
    target.closest("[data-reka-popper-content-wrapper]")
  );
}

watch(
  () => props.description,
  (doc) => {
    const next = serialize(doc);
    const ed = composerEditor.value;
    // Do not clobber in-progress edits or an active selection (bubble open).
    if (ed?.isFocused) return;
    if (ed && !ed.state.selection.empty) return;
    lastSavedJson.value = next;
    if (!ed) return;
    if (serialize(ed.getJSON()) !== next) {
      ed.commands.setContent(normalizeTiptapDoc(doc), { emitUpdate: false });
    }
  },
  { deep: true },
);

function onComposerEditorUpdate(ed: Editor | null) {
  composerEditor.value = ed;
  if (!ed || hydrated.value) return;
  ed.commands.setContent(normalizeTiptapDoc(props.description), { emitUpdate: false });
  lastSavedJson.value = serialize(props.description);
  hydrated.value = true;
}

function flushSave() {
  if (props.disabled || props.isSaving) return;
  const instance = composerEditor.value;
  if (!instance) return;
  const next = normalizeTiptapDoc(instance.getJSON());
  const serialized = serialize(next);
  if (serialized === lastSavedJson.value) return;
  lastSavedJson.value = serialized;
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
  // Portaled bubble/menus often report null relatedTarget; wait for focus to settle.
  requestAnimationFrame(() => {
    if (isOverlayFocus(document.activeElement)) return;
    // Active text selection ⇒ format bubble session; debounced save already covers edits.
    const sel = composerEditor.value?.state.selection;
    if (sel && !sel.empty) return;
    flushSave();
  });
}

function onSubmitFlush() {
  flushSave();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape" || !composerEditor.value) return;
  e.preventDefault();
  composerEditor.value.commands.setContent(normalizeTiptapDoc(props.description), {
    emitUpdate: false,
  });
  lastSavedJson.value = serialize(props.description);
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
  },
);

function onSurfaceClick(e: MouseEvent) {
  const ed = composerEditor.value;
  if (!ed || ed.isDestroyed || props.disabled) return;
  const target = e.target;
  if (!(target instanceof Element)) return;
  // Clicks already inside the contenteditable are handled by TipTap.
  if (target.closest(".ProseMirror")) return;
  ed.chain().focus("end").run();
}
</script>

<template>
  <div class="flex:col-sm min-h-0" @keydown.capture="onKeydown">
    <RichTextInsertContextMenu v-model:open="insertMenuOpen" :editor="composerEditor" :hooks="actionHooks">
      <div
        class="basis-[8rem] shrink-0 min-w-0 rounded-lg px-2 -mx-2 py-1 h-full"
        @focusout="onBlurSave"
        @click="onSurfaceClick"
      >
        <RichTextComposer
          :mention="mention"
          :me-id="meId"
          :workspace-id="workspaceId"
          :bubble-menu-enabled="bubbleMenuEnabled"
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
              class="flex:row-md z-[90] flex max-w-[min(100vw-1rem,28rem)] flex-wrap items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
              @mousedown.prevent
            >
              <MessageComposerActions
                :editor="bubbleEditor"
                @insert-inline-image="openInlineImageFilePicker"
              />
            </div>
          </template>
        </RichTextComposer>
      </div>
    </RichTextInsertContextMenu>

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
