<script lang="ts" setup>
import { Button, ButtonGroup, ButtonGroupSeparator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import {
  clearChannelDraft,
  composerQuoteRef,
  loadChannelDraft,
  quotedMessageExcerpt,
  useChannelMessageDraft,
  useChannelTypingPulse,
  useWorkspaceOnline,
} from "@/domain/channels";
import AttachmentTilesList from "@/presentationals/messages/AttachmentTilesList.vue";
import { useMessageComposerAttachments } from "@/presentationals/messages/composables/message-composer-attachments";
import { useMessageComposerEditingBody } from "@/presentationals/messages/composables/message-composer-editing-body";
import { useMessageComposerSchedule } from "@/presentationals/messages/composables/message-composer-schedule";
import { useMessageComposerScreenRecording } from "@/presentationals/messages/composables/message-composer-screen-recording";
import type { MessageComposerAttachmentHandlers } from "@/presentationals/messages/message-composer.types";
import MessageComposerActions from "@/presentationals/messages/MessageComposerActions.vue";
import MessageComposerPollSection from "@/presentationals/messages/MessageComposerPollSection.vue";
import ScheduleMessageCustomDialog from "@/presentationals/messages/ScheduleMessageCustomDialog.vue";
import ScheduleMessageDropdown from "@/presentationals/messages/ScheduleMessageDropdown.vue";
import { RichTextComposer } from "@/presentationals/rich-text";
import type {
  CreateScheduledMessageBody,
  IMessage,
  IMessageAttachment,
  IReply,
  IUser,
  MessagePollBody,
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
import type { Editor, JSONContent } from "@tiptap/core";
import { ChevronDown, Paperclip } from "lucide-vue-next";
import { computed, ref, shallowRef, watch } from "vue";

const { isUserOnline } = useWorkspaceOnline();

const props = withDefaults(
  defineProps<{
    mentionables?: IUser[];
    meId?: number;
    channelId: number;
    placeholder?: string;
    editingMessage?: {
      id: number;
      content: JSONContent;
      attachments?: IMessageAttachment[];
      poll?: IMessage["poll"];
    } | null;
    quotedMessage?: (IMessage | IReply) | null;
    attachmentHandlers: MessageComposerAttachmentHandlers;
    /** Channel composer only: poll fields render inline below the editor (not in TipTap JSON). */
    enableComposerPoll?: boolean;
  }>(),
  {
    editingMessage: null,
    quotedMessage: null,
    enableComposerPoll: false,
  },
);

const emit = defineEmits<{
  (e: "send-message", value: ReplyMessageBody | SendMessageBody): void;
  (e: "send-scheduled-message", value: CreateScheduledMessageBody): void;
  (e: "submit-edit", messageId: number, value: UpdateChannelMessageBody): void;
  (e: "existing-attachment-removed"): void;
  (e: "clear-quote"): void;
  (e: "cancel-edit"): void;
}>();

const composerPollBody = ref<MessagePollBody | null>(null);

function normalizedComposerPoll(): MessagePollBody | undefined {
  if (!props.enableComposerPoll) return undefined;
  const b = composerPollBody.value;
  if (!b) return undefined;
  const question = b.question.trim();
  const options = b.options
    .map((o) => ({ id: o.id, label: o.label.trim() }))
    .filter((o) => o.label.length > 0);
  if (question.length === 0 || options.length < 2) return undefined;
  return { question, options };
}

function pollPayloadForEdit(): MessagePollBody | null | undefined {
  if (!props.enableComposerPoll || !props.editingMessage) return undefined;
  if (composerPollBody.value == null) {
    return props.editingMessage.poll ? null : undefined;
  }
  return normalizedComposerPoll();
}

watch(
  () => props.editingMessage,
  (msg) => {
    if (msg) {
      suppressTypingSignals.value = false;
    }
    if (!props.enableComposerPoll) {
      composerPollBody.value = null;
      return;
    }
    if (msg) {
      composerPollBody.value = msg.poll
        ? {
            question: msg.poll.question,
            options: msg.poll.options.map((o) => ({ ...o })),
          }
        : null;
      return;
    }
    const d = loadChannelDraft(props.channelId);
    composerPollBody.value = d?.poll ?? null;
  },
  { immediate: true },
);

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
 * Typing pulse (register before draft so channel watchers run stop-before-load).
 */

const {
  suppressTypingSignals,
  maybeStartTypingPulse,
  emitTypingStop,
  runWithTypingSuppressedDuringEditorMutation,
} = useChannelTypingPulse({
  channelId: () => props.channelId,
  editor,
});

/**
 * Draft autosave.
 */

const { scheduleDraftSave, cancelPendingDraftSave } = useChannelMessageDraft({
  channelId: () => props.channelId,
  editingMessage: () => props.editingMessage,
  editor,
  runWithEditorMutationSuppressed: runWithTypingSuppressedDuringEditorMutation,
  whenEditorMissingAfterChannelChange: () => {
    suppressTypingSignals.value = false;
  },
  getPollDraft: props.enableComposerPoll === true ? () => composerPollBody.value ?? null : undefined,
  onDraftRestored:
    props.enableComposerPoll === true
      ? (draft) => {
          if (props.editingMessage) return;
          composerPollBody.value = draft?.poll ?? null;
        }
      : undefined,
});

watch(
  composerPollBody,
  () => {
    if (!props.enableComposerPoll || props.editingMessage) return;
    scheduleDraftSave(editor.value?.getJSON());
  },
  { deep: true },
);

function onEditorUpdateForDraft() {
  scheduleDraftSave(editor.value?.getJSON());
}

function onEditorUpdateForTyping() {
  if (!editor.value) return;
  maybeStartTypingPulse(editor.value);
}

watch(
  editor,
  (ed, prevEd) => {
    if (prevEd) {
      prevEd.off("update", onEditorUpdateForDraft);
      prevEd.off("update", onEditorUpdateForTyping);
      prevEd.off("blur", emitTypingStop);
    }
    if (!ed) return;
    ed.on("update", onEditorUpdateForDraft);
    ed.on("update", onEditorUpdateForTyping);
    ed.on("blur", emitTypingStop);
  },
  { immediate: true },
);

const { customScheduleOpen, activeSchedule, scheduleSummary, onCustomScheduleConfirm, clearActiveSchedule } =
  useMessageComposerSchedule({
    channelId: () => props.channelId,
    getEditor: () => editor.value,
    editingMessage: () => props.editingMessage,
  });

const {
  editingAttachmentRows,
  removingEditingAttachment,
  pendingAttachments,
  stagingFileInputRef,
  scheduleAttachmentHint,
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
  const pollPayload = normalizedComposerPoll();
  const pollPanelIncomplete =
    props.enableComposerPoll === true && composerPollBody.value != null && pollPayload === undefined;

  if (pollPanelIncomplete) return;

  const hasBody = plain.length > 0 || docContainsImageNodes(doc);
  const hasPoll = pollPayload !== undefined;
  if (!hasBody && !hasPoll) return;

  if (props.editingMessage) {
    const stagedIds = pendingAttachments.value.map((a) => a.id);
    const inlineIds = collectImageAttachmentIdsFromDoc(doc);
    const attachmentIds = [...new Set([...stagedIds, ...inlineIds])];
    const pollPatch = pollPayloadForEdit();
    emit("submit-edit", props.editingMessage.id, {
      content: doc,
      ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
      ...(pollPatch !== undefined ? { poll: pollPatch } : {}),
    });
    pendingAttachments.value = [];
    resetStagingTransfers();
    composerPollBody.value = null;
    emitTypingStop();
    return;
  }

  const stagedIds = pendingAttachments.value.map((a) => a.id);
  const inlineIds = collectImageAttachmentIdsFromDoc(doc);
  const attachmentIds = activeSchedule.value ? [] : [...new Set([...stagedIds, ...inlineIds])];
  const quoteRef = props.quotedMessage ? composerQuoteRef(props.quotedMessage) : {};

  if (activeSchedule.value) {
    emit("send-scheduled-message", {
      content: doc,
      ...quoteRef,
      dueAt: activeSchedule.value.dueAt.toISOString(),
      recurrence: activeSchedule.value.recurrence,
      ...(pollPayload ? { poll: pollPayload } : {}),
    });
    activeSchedule.value = null;
  } else {
    emit("send-message", {
      content: doc,
      ...quoteRef,
      ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
      ...(pollPayload ? { poll: pollPayload } : {}),
    });
  }

  editor.value.commands.clearContent();
  pendingAttachments.value = [];
  resetStagingTransfers();
  composerPollBody.value = null;
  emitTypingStop();
  clearChannelDraft(props.channelId);
  cancelPendingDraftSave();
}

function onCancelEdit() {
  emit("cancel-edit");
}

function setComposerPollBody(v: MessagePollBody | null) {
  composerPollBody.value = v;
}

function toggleComposerPoll() {
  if (composerPollBody.value != null) {
    composerPollBody.value = null;
  } else {
    composerPollBody.value = {
      question: "",
      options: [
        { id: crypto.randomUUID(), label: "" },
        { id: crypto.randomUUID(), label: "" },
      ],
    };
  }
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
        :mentionables="mentionables"
        :me-id="meId"
        :is-user-online="isUserOnline"
        :placeholder="composerPlaceholder"
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
    <MessageComposerPollSection
      v-if="enableComposerPoll"
      :model-value="composerPollBody"
      @update:model-value="setComposerPollBody"
    />
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
      v-if="
        stagingAttachmentRows.length ||
        scheduleAttachmentHint ||
        (editingMessage && editingAttachmentRows.length)
      "
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
      <p v-if="scheduleAttachmentHint" class="mb-1 text-[0.65rem] leading-snug text-muted-foreground">
        {{ scheduleAttachmentHint }}
      </p>
      <AttachmentTilesList
        v-if="stagingAttachmentRows.length"
        aria-label="Staging attachments"
        :rows="stagingAttachmentRows"
        :disabled="!!activeSchedule || attachmentsStagingBlocked"
        removable
        :me-id="meId ?? null"
        @remove="removeStagingAttachment($event)"
        @dismiss-pending="dismissPendingTransfer($event)"
      />
    </div>

    <div class="flex:row-md flex:center-y mt-2 shrink-0 text-secondary-foreground">
      <MessageComposerActions
        :editor="editor"
        :show-poll-toggle="enableComposerPoll"
        :poll-active="composerPollBody != null"
        @insert-inline-image="openInlineImageFilePicker"
        @toggle-poll="toggleComposerPoll"
      />

      <div
        v-if="!editingMessage && scheduleSummary"
        class="flex:row items-center gap-1 text-xs text-muted-foreground min-w-0"
      >
        <span class="truncate max-w-[14rem]">{{ scheduleSummary }}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="h-6 w-6 shrink-0"
          @click.stop="clearActiveSchedule"
        >
          <span class="sr-only">Clear schedule</span>
          <Icon name="io-close" class="size-3" />
        </Button>
      </div>

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
        :disabled="!!activeSchedule || attachmentsStagingBlocked"
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
      <template v-else-if="channelId != null">
        <ButtonGroup>
          <Button
            type="button"
            variant="default"
            size="sm"
            class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
            :disabled="attachmentsStagingBlocked"
            @click="onSendMessage"
          >
            <Icon name="io-paper-plane" />
            {{ activeSchedule ? "Schedule" : "Send" }}
          </Button>
          <ButtonGroupSeparator
            class="!m-0 !w-px !min-w-px shrink-0 self-stretch border-0 bg-border/70"
            orientation="vertical"
          />
          <ScheduleMessageDropdown
            v-model:active-schedule="activeSchedule"
            @open-custom-schedule-dialog="customScheduleOpen = true"
          >
            <Button
              type="button"
              variant="default"
              size="sm"
              class="shrink-0 border-0 bg-[#3A66FF] px-1.5 text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Schedule options"
              :disabled="attachmentsStagingBlocked"
            >
              <ChevronDown class="w-4 h-4" />
            </Button>
          </ScheduleMessageDropdown>
        </ButtonGroup>
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
    <ScheduleMessageCustomDialog v-model:open="customScheduleOpen" @confirm="onCustomScheduleConfirm" />
  </div>
</template>
