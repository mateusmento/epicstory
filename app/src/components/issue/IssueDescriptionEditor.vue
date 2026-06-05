<script lang="ts" setup>
import MessageComposerActions from "@/components/messages/MessageComposerActions.vue";
import { RichTextComposer, RichTextPreview } from "@/components/rich-text";
import { useDependency } from "@/core/dependency-injection";
import { Button } from "@/design-system";
import { IssueApi } from "@epicstory/api-client";
import type { IUser as IUser } from "@epicstory/contracts";
import { normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { computed, ref, shallowRef, watch } from "vue";

const INLINE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const props = withDefaults(
  defineProps<{
    description: JSONContent;
    issueId: number;
    disabled?: boolean;
    isSaving?: boolean;
    mentionables?: IUser[];
    meId?: number;
    onMentionListReachedBottom?: () => void | Promise<void>;
    mentionListHasMore?: boolean;
    mentionListLoadingMore?: boolean;
  }>(),
  {
    mentionables: () => [],
    mentionListHasMore: true,
    mentionListLoadingMore: false,
  },
);

const emit = defineEmits<{
  saveDescription: [doc: JSONContent];
}>();

const isEditingDescription = ref(false);

const issueApi = useDependency(IssueApi);

const composerEditor = shallowRef<Editor | null>(null);

const descriptionIsEmpty = computed(() => {
  const t = tiptapToPlainText(normalizeTiptapDoc(props.description), { stripFormatting: true }).trim();
  return t.length === 0;
});

function onComposerEditorUpdate(ed: Editor | null) {
  composerEditor.value = ed;
}

watch(
  [composerEditor, isEditingDescription],
  ([ed, editing]) => {
    if (!editing || !ed) return;
    ed.commands.setContent(normalizeTiptapDoc(props.description), { emitUpdate: false });
    queueMicrotask(() => ed.commands.focus("end"));
  },
  { flush: "post" },
);

function startEditDescription() {
  if (props.disabled) return;
  isEditingDescription.value = true;
}

function cancelEditDescription() {
  if (props.disabled) return;
  isEditingDescription.value = false;
}

function finishEditDescription() {
  if (props.disabled) return;
  const instance = composerEditor.value;
  if (!instance) return;
  emit("saveDescription", normalizeTiptapDoc(instance.getJSON()));
  isEditingDescription.value = false;
}

function onDescriptionEditKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  cancelEditDescription();
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
      /* upload errors are non-blocking for inline images */
    }
  }
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
</script>

<template>
  <div class="flex:col-sm min-h-0">
    <div class="flex:row-md flex:center-y">
      <div class="text-sm text-secondary-foreground">Description</div>
      <div class="flex-1" />
      <div class="text-xs text-secondary-foreground">Double-click to edit</div>
    </div>

    <div v-if="!isEditingDescription" class="min-h-0">
      <div
        class="cursor-text rounded-xl p-3 -mx-3 hover:bg-muted/50"
        @dblclick="startEditDescription"
        title="Double-click to edit"
      >
        <div v-if="!descriptionIsEmpty" class="text-sm text-foreground leading-relaxed">
          <RichTextPreview :content="description" :mentioned-users="mentionables" :me-id="meId ?? 0" />
        </div>
        <div v-else class="text-sm text-secondary-foreground">Add a description…</div>
      </div>
    </div>

    <div
      v-else
      class="p-3 border border-border rounded-xl bg-card"
      @keydown.capture="onDescriptionEditKeydown"
    >
      <div class="min-h-[12rem] min-w-0 mb-2">
        <RichTextComposer
          :mentionables="mentionables"
          :me-id="meId"
          placeholder="Write a description…"
          :on-mention-list-reached-bottom="onMentionListReachedBottom"
          :mention-list-has-more="mentionListHasMore"
          :mention-list-loading-more="mentionListLoadingMore"
          @update:editor="onComposerEditorUpdate"
          @pasted-files="onRichTextPastedFiles"
          @submit="finishEditDescription"
        >
          <template #bubbleMenu="{ editor: bubbleEditor }">
            <div
              class="flex:row-md z-[90] flex max-w-[min(100vw-1rem,42rem)] flex-wrap items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
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

      <input
        ref="inlineImageInputRef"
        type="file"
        class="sr-only"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        @change="onInlineImageFilesSelected"
      />

      <div class="flex:row-md flex:center-y flex-wrap gap-y-2 justify-between">
        <MessageComposerActions :editor="composerEditor" @insert-inline-image="openInlineImageFilePicker" />

        <div class="flex:row-md flex:center-y shrink-0">
          <div class="text-xs text-secondary-foreground mr-2">Ctrl+Enter to save • Esc to cancel</div>
          <Button variant="outline" size="xs" :disabled="isSaving" @click="cancelEditDescription"
            >Cancel</Button
          >
          <Button size="xs" :disabled="isSaving" @click="finishEditDescription">Done</Button>
        </div>
      </div>
    </div>
  </div>
</template>
