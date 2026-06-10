<script lang="ts" setup>
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import {
  clearChannelDraft,
  composerQuoteRef,
  quotedMessageExcerpt,
  useChannelMessageDraft,
} from "@/domain/channels";
import AttachmentTilesList from "@/presentationals/messages/AttachmentTilesList.vue";
import { useMessageComposerAttachments } from "@/presentationals/messages/composables/message-composer-attachments";
import { useMessageComposerEditingBody } from "@/presentationals/messages/composables/message-composer-editing-body";
import { useMessageComposerScreenRecording } from "@/presentationals/messages/composables/message-composer-screen-recording";
import type { MessageComposerAttachmentHandlers } from "@/presentationals/messages/message-composer.types";
import MessageComposerActions from "@/presentationals/messages/MessageComposerActions.vue";
import type { ResolvedSchedule } from "@/presentationals/messages/schedule-builders";
import { RichTextComposer } from "@/presentationals/rich-text";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import type {
  IMessage,
  IReply,
  ReplyMessageBody,
  SendMessageBody,
  UpdateChannelMessageBody,
} from "@epicstory/contracts";
import {
  collectImageAttachmentIdsFromDoc,
  docContainsImageNodes,
  stripImageNodesFromDoc,
  tiptapToPlainText,
} from "@epicstory/tiptap";
import type { Editor } from "@tiptap/core";
import { Paperclip } from "lucide-vue-next";
import { computed, ref, shallowRef, watch } from "vue";

const props = withDefaults(
  defineProps<{
    mention?: MentionComposerView;
    meId?: number;
    channelId: number;
    placeholder?: string;
    editingMessage?: (IMessage | IReply) | null;
    quotedMessage?: (IMessage | IReply) | null;
    attachmentHandlers: MessageComposerAttachmentHandlers;
  }>(),
  {
    editingMessage: null,
    quotedMessage: null,
  },
);

const emit = defineEmits<{
  (e: "send-message", value: ReplyMessageBody | SendMessageBody): void;
  (e: "submit-edit", value: UpdateChannelMessageBody): void;
  (e: "existing-attachment-removed"): void;
  (e: "clear-quote"): void;
  (e: "cancel-edit"): void;
  (e: "mention-load-more"): void;
}>();

const composerPlaceholder = computed(() =>
  props.editingMessage ? "Edit message…" : (props.placeholder ?? "Send a message…"),
);

const quotedExcerpt = computed(() => (props.quotedMessage ? quotedMessageExcerpt(props.quotedMessage) : ""));

/**
 * Rich text editor.
 */

const editor = shallowRef<Editor | null>(null);

function onRichTextEditorUpdate(ed: Editor | null) {
  editor.value = ed;
}

/**
 * Draft autosave.
 */

const { scheduleDraftSave, cancelPendingDraftSave } = useChannelMessageDraft({
  channelId: () => props.channelId,
  editingMessage: () => props.editingMessage,
  editor,
});

function onEditorUpdateForDraft() {
  scheduleDraftSave(editor.value?.getJSON());
}

watch(
  editor,
  (ed, prevEd) => {
    if (prevEd) {
      prevEd.off("update", onEditorUpdateForDraft);
    }
    if (!ed) return;
    ed.on("update", onEditorUpdateForDraft);
  },
  { immediate: true },
);

/** Scheduling is disabled for issue comments; attachments composable still expects this ref. */
const activeSchedule = ref<ResolvedSchedule | null>(null);

const {
  editingAttachmentRows,
  removingEditingAttachment,
  pendingAttachments,
  stagingFileInputRef,
  stagingAttachmentRows,
  attachmentsStagingBlocked,
  uploadStagingFiles,
  dismissPendingTransfer,
  resetStagingTransfers,
  openStagingFilePicker,
  onStagingFilesSelected,
  removeStagingAttachment,
  onRemoveEditingAttachment,
} = useMessageComposerAttachments({
  channelId: () => props.channelId,
  editingMessage: () => props.editingMessage,
  attachmentHandlers: () => props.attachmentHandlers,
  activeSchedule,
  onExistingAttachmentRemoved: () => emit("existing-attachment-removed"),
});

const { isRecording, secondsElapsed, onToggleRecording, formatRecordingElapsed } =
  useMessageComposerScreenRecording();

useMessageComposerEditingBody({
  editor,
  editingMessage: () => props.editingMessage,
});

function onRichTextPastedFiles(files: File[]) {
  uploadStagingFiles(files);
}

const inlineImageInputRef = ref<HTMLInputElement | null>(null);

function openInlineImageFilePicker() {
  inlineImageInputRef.value?.click();
}

async function onInlineImageFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const raw = input.files ? Array.from(input.files) : [];
  input.value = "";
  const images = raw.filter((f) => f.type.startsWith("image/"));
  const ed = editor.value;
  if (!images.length || !ed) return;
  const uploaded = await props.attachmentHandlers.uploadFiles(images);
  for (const u of uploaded) {
    ed.chain()
      .focus()
      .setImage({ src: u.url, attachmentId: u.id } as never)
      .run();
  }
}

function onSendMessage() {
  if (!editor.value) return;

  if (attachmentsStagingBlocked.value) return;

  const doc = editor.value.getJSON();
  const stripped = stripImageNodesFromDoc(doc);
  const plain = tiptapToPlainText(stripped, { stripFormatting: true }).trim();
  if (!plain && !docContainsImageNodes(doc)) return;

  if (props.editingMessage) {
    const stagedIds = pendingAttachments.value.map((a) => a.id);
    const inlineIds = collectImageAttachmentIdsFromDoc(doc);
    const attachmentIds = [...new Set([...stagedIds, ...inlineIds])];
    emit("submit-edit", {
      content: doc,
      ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
    });
    pendingAttachments.value = [];
    resetStagingTransfers();
    return;
  }

  const stagedIds = pendingAttachments.value.map((a) => a.id);
  const inlineIds = collectImageAttachmentIdsFromDoc(doc);
  const attachmentIds = [...new Set([...stagedIds, ...inlineIds])];
  const scheduledQuote = props.quotedMessage ? composerQuoteRef(props.quotedMessage) : {};

  emit("send-message", {
    content: doc,
    ...scheduledQuote,
    ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
  });

  editor.value.commands.clearContent();
  pendingAttachments.value = [];
  resetStagingTransfers();
  clearChannelDraft(props.channelId);
  cancelPendingDraftSave();
}

function onCancelEdit() {
  emit("cancel-edit");
}
</script>

<template>
  <div
    class="flex:col-md flex min-h-0 max-h-[50vh] flex-col overflow-hidden p-3 border border-border rounded-xl bg-card focus-within:outline outline-1 outline-border/60"
    @click="editor?.commands.focus()"
  >
    <div
      v-if="quotedMessage && !editingMessage"
      class="flex:row-md flex:center-y shrink-0 gap-2 mb-2 pb-2 border-b border-border/80 text-xs text-muted-foreground"
    >
      <Icon name="fa-quote-right" class="size-4 self-start" />
      <div class="flex:col-md flex-1 min-w-0">
        <span class="font-medium text-foreground/80">{{ quotedMessage.sender.name }}</span>
        <span class="text-muted-foreground/90"> {{ quotedExcerpt }}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-7 w-7 shrink-0"
        @click.stop="emit('clear-quote')"
      >
        <span class="sr-only">Remove quote</span>
        <Icon name="io-close" class="size-4" />
      </Button>
    </div>
    <div class="min-h-0 min-w-0 flex-auto overflow-y-auto overflow-x-auto py-0.5 font-lato">
      <RichTextComposer
        :mention="mention"
        :me-id="meId"
        :placeholder="composerPlaceholder"
        @mention-load-more="emit('mention-load-more')"
        @update:editor="onRichTextEditorUpdate"
        @pasted-files="onRichTextPastedFiles"
        @submit="onSendMessage"
      >
        <template #bubbleMenu="{ editor: bubbleEditor }">
          <div
            class="flex:row-md z-[90] flex max-w-[min(100vw-1rem,42rem)] flex-wrap items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
            @mousedown.prevent
          >
            <MessageComposerActions :editor="bubbleEditor" @insert-inline-image="openInlineImageFilePicker" />
          </div>
        </template>
      </RichTextComposer>
    </div>
    <input ref="stagingFileInputRef" type="file" class="sr-only" multiple @change="onStagingFilesSelected" />
    <input
      ref="inlineImageInputRef"
      type="file"
      class="sr-only"
      accept="image/png,image/jpeg,image/gif,image/webp"
      multiple
      @change="onInlineImageFilesSelected"
    />
    <div
      v-if="stagingAttachmentRows.length || (editingMessage && editingAttachmentRows.length)"
      class="shrink-0 border-t border-border/80 pt-2"
      @click.stop
    >
      <AttachmentTilesList
        v-if="editingMessage && editingAttachmentRows.length"
        aria-label="Message attachments"
        :rows="editingAttachmentRows"
        :disabled="removingEditingAttachment"
        removable
        :me-id="meId ?? null"
        @remove="onRemoveEditingAttachment($event)"
        @dismiss-pending="dismissPendingTransfer($event)"
      />
      <AttachmentTilesList
        v-if="stagingAttachmentRows.length"
        aria-label="Staging attachments"
        :rows="stagingAttachmentRows"
        removable
        :me-id="meId ?? null"
        :disabled="attachmentsStagingBlocked"
        @remove="removeStagingAttachment($event)"
        @dismiss-pending="dismissPendingTransfer($event)"
      />
    </div>

    <div class="flex:row-md flex:center-y mt-2 shrink-0 text-secondary-foreground">
      <MessageComposerActions :editor="editor" @insert-inline-image="openInlineImageFilePicker" />

      <div class="flex-1"></div>

      <Button
        v-if="editingMessage"
        type="button"
        variant="ghost"
        size="sm"
        class="text-muted-foreground"
        @click="onCancelEdit"
      >
        Cancel
      </Button>

      <Button variant="ghost" size="icon" @click="onToggleRecording">
        <Icon v-if="!isRecording" name="bi-camera-video" class="w-6 h-6" />
        <template v-else>
          <Icon name="ri-record-circle-fill" class="w-6 h-6 text-red-500" />
          <span class="text-xs ml-1 text-red-400">{{ formatRecordingElapsed(secondsElapsed) }}</span>
        </template>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Attach files"
        class="shrink-0 mr-0.5"
        aria-label="Attach files"
        :disabled="attachmentsStagingBlocked"
        @click.stop="openStagingFilePicker()"
      >
        <Paperclip class="size-5" />
      </Button>

      <template v-if="editingMessage">
        <Button
          type="button"
          variant="default"
          size="sm"
          class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
          :disabled="attachmentsStagingBlocked"
          @click="onSendMessage"
        >
          <Icon name="io-paper-plane" />
          Save
        </Button>
      </template>
      <Button
        v-else
        type="button"
        variant="default"
        size="sm"
        class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
        :disabled="attachmentsStagingBlocked"
        @click="onSendMessage"
      >
        <Icon name="io-paper-plane" />
        Send
      </Button>
    </div>
  </div>
</template>
