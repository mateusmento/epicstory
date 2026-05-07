<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { startRecording } from "@/core/screen-recording";
import { Button, ButtonGroup, ButtonGroupSeparator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import {
  clearChannelDraft,
  composerQuoteRef,
  useChannelMessageDraft,
  useChannelTypingPulse,
  type IMessage,
  type IReply,
  type IScheduledMessageRecurrence,
} from "@/domain/channels";
import { ChannelApi, type UploadedAttachment } from "@/domain/channels/services/channel.service";
import {
  messageBodyPlainText,
  normalizeTiptapDoc,
  stripImageNodesFromDoc,
  tiptapToPlainText,
} from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { ChevronDown, Paperclip } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { RichTextComposer } from "../rich-text";
import MessageAttachments from "./MessageAttachments.vue";
import MessageComposerActions from "./MessageComposerActions.vue";
import { formatScheduleSummary, type ResolvedSchedule } from "./schedule-builders";
import ScheduleMessageCustomDialog from "./ScheduleMessageCustomDialog.vue";
import ScheduleMessageDropdown from "./ScheduleMessageDropdown.vue";

const props = withDefaults(
  defineProps<{
    mentionables?: User[];
    meId?: number;
    channelId: number;
    placeholder?: string;
    editingMessage?: { id: number; content: JSONContent } | null;
    quotedMessage?: (IMessage | IReply) | null;
  }>(),
  {
    editingMessage: null,
    quotedMessage: null,
  },
);

const emit = defineEmits<{
  (
    e: "send-message",
    value: {
      content: JSONContent;
      quotedMessageId?: number;
      quotedReplyId?: number;
      attachmentIds?: number[];
    },
  ): void;
  (
    e: "send-scheduled-message",
    value: {
      content: JSONContent;
      quotedMessageId?: number;
      dueAt: string;
      recurrence: IScheduledMessageRecurrence;
    },
  ): void;
  (e: "submit-edit", value: { messageId: number; content: JSONContent }): void;
  (e: "clear-quote"): void;
  (e: "cancel-edit"): void;
}>();

const channelApi = useDependency(ChannelApi);

const composerPlaceholder = computed(() =>
  props.editingMessage ? "Edit message…" : (props.placeholder ?? "Send a message…"),
);

const quotedExcerpt = computed(() => {
  if (!props.quotedMessage) return "";
  const raw = props.quotedMessage.displayContent ?? messageBodyPlainText(props.quotedMessage);
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 160 ? `${t.slice(0, 160)}…` : t;
});

/**
 * Rich text editor.
 */

const editor = shallowRef<Editor | null>(null);

function onRichTextEditorUpdate(ed: Editor | null) {
  editor.value = ed;
}

function onEditorUpdateForDraft() {
  scheduleDraftSave(editor.value?.getJSON());
}

function onEditorUpdateForTyping() {
  if (!editor.value) return;
  maybeStartTypingPulse(editor.value);
}

function onEditorBlurForTyping() {
  clearTypingPulse();
  emitTypingStop();
}

watch(
  editor,
  (ed, prevEd) => {
    if (prevEd) {
      prevEd.off("update", onEditorUpdateForDraft);
      prevEd.off("update", onEditorUpdateForTyping);
      prevEd.off("blur", onEditorBlurForTyping);
    }
    if (!ed) return;
    ed.on("update", onEditorUpdateForDraft);
    ed.on("update", onEditorUpdateForTyping);
    ed.on("blur", onEditorBlurForTyping);
  },
  { immediate: true },
);

/**
 * Draft autosave.
 */

const { loadDraftToEditor, scheduleDraftSave, flushDraftSync, cancelPendingDraftSave } =
  useChannelMessageDraft({
    channelId: () => props.channelId,
    editingMessage: () => props.editingMessage,
    editor,
  });

/**
 * Typing pulse.
 */

const {
  isEmittingTyping,
  suppressTypingSignals,
  maybeStartTypingPulse,
  clearTypingPulse,
  emitTypingStop,
  emitTypingStopForChannel,
} = useChannelTypingPulse({
  channelId: () => props.channelId,
  editor,
});

/**
 * Scheduled messages.
 */
const customScheduleOpen = ref(false);
const activeSchedule = ref<ResolvedSchedule | null>(null);

const scheduleSummary = computed(() =>
  activeSchedule.value ? formatScheduleSummary(activeSchedule.value) : "",
);

function onCustomScheduleConfirm(s: ResolvedSchedule) {
  activeSchedule.value = s;
  customScheduleOpen.value = false;
}

function clearActiveSchedule() {
  activeSchedule.value = null;
}

function focusComposerEnd() {
  const ed = editor.value;
  if (ed) ed.chain().focus("end").run();
}

/** Return focus to the composer when the (non-modal) custom schedule layer closes. */
watch(customScheduleOpen, (open) => {
  if (open) return;
  nextTick().then(() => {
    focusComposerEnd();
  });
});

/**
 * Staged uploads.
 */
const pendingAttachments = ref<UploadedAttachment[]>([]);
const stagingFileInputRef = ref<HTMLInputElement | null>(null);

const scheduleAttachmentHint = computed(() =>
  activeSchedule.value && pendingAttachments.value.length > 0
    ? "Attachments are not sent in scheduled messages. Clear the schedule or send now to include them."
    : null,
);

/** Staged uploads (linked on send, not embedded in TipTap JSON). */
async function uploadStagingFiles(fileList: File[]) {
  if (!fileList.length) return;
  const next = [...pendingAttachments.value];
  for (const file of fileList) {
    try {
      const a = await channelApi.uploadAttachment(props.channelId, file);
      next.push(a);
    } catch {
      /* keep composing */
    }
  }
  pendingAttachments.value = next;
}

function onRichTextPastedFiles(files: File[]) {
  uploadStagingFiles(files);
}

/**
 * Rich text editor actions
 */
function openStagingFilePicker() {
  stagingFileInputRef.value?.click();
}

async function onStagingFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  input.value = "";
  if (!input.files?.length) return;
  await uploadStagingFiles(Array.from(input.files));
}

function removeStagingAttachment(id: number) {
  pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id);
}

function onSendMessage() {
  if (!editor.value) return;
  if (editor.value.isEmpty) return;

  const doc = editor.value.getJSON();
  const stripped = stripImageNodesFromDoc(doc);
  const plain = tiptapToPlainText(stripped, { stripFormatting: true });
  if (!plain.trim()) return;

  if (props.editingMessage) {
    emit("submit-edit", {
      messageId: props.editingMessage.id,
      content: doc,
    });
    emitTypingStop();
    return;
  }

  const attachmentIds = activeSchedule.value ? [] : pendingAttachments.value.map((a) => a.id);
  const scheduledQuote = props.quotedMessage ? composerQuoteRef(props.quotedMessage) : {};

  if (activeSchedule.value) {
    emit("send-scheduled-message", {
      content: doc,
      ...scheduledQuote,
      dueAt: activeSchedule.value.dueAt.toISOString(),
      recurrence: activeSchedule.value.recurrence,
    });
    activeSchedule.value = null;
  } else {
    emit("send-message", {
      content: doc,
      ...scheduledQuote,
      ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
    });
  }

  editor.value.commands.clearContent();
  pendingAttachments.value = [];
  emitTypingStop();
  clearChannelDraft(props.channelId);
  cancelPendingDraftSave();
}

function onCancelEdit() {
  emit("cancel-edit");
}

/**
 * Screen recording.
 */
const isRecording = ref(false);
const stopRecording = shallowRef<(() => void) | null>(null);
const secondsElapsed = ref(0);
const counter = ref<ReturnType<typeof setInterval> | null>(null);

async function onToggleRecording() {
  if (!isRecording.value) {
    secondsElapsed.value = 0;
    isRecording.value = true;
    stopRecording.value = await startRecording();
    counter.value = setInterval(() => {
      secondsElapsed.value++;
    }, 1000);
  } else {
    counter.value && clearInterval(counter.value);
    counter.value = null;
    stopRecording.value?.();
    stopRecording.value = null;
    isRecording.value = false;
  }
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

/** Component logic */

watch(
  () => props.editingMessage,
  (msg) => {
    if (msg) {
      activeSchedule.value = null;
      pendingAttachments.value = [];
      suppressTypingSignals.value = false;
    }
  },
);

watch(
  [editor, () => props.editingMessage],
  async ([editor, msg], [prevEditor, prevMsg]) => {
    if (!editor) return;
    if (!msg) {
      editor.commands.clearContent();
      return;
    }
    // Avoid clobbering in-progress edits, but still initialize content when the editor
    // instance becomes available (common on mount).
    if (prevMsg?.id === msg.id && prevEditor === editor) return;
    const doc = normalizeTiptapDoc(msg.content);
    editor.commands.setContent(doc);
    editor.commands.focus("end");
  },
  { flush: "post", immediate: true },
);

onBeforeUnmount(() => {
  flushDraftSync(editor.value?.getJSON());
});

onBeforeUnmount(() => {
  emitTypingStop();
});

watch(
  () => props.channelId,
  async () => {
    if (!editor.value) return;
    suppressTypingSignals.value = true;
    await loadDraftToEditor(editor.value);
    suppressTypingSignals.value = false;
  },
  { flush: "post" },
);

watch(
  () => props.channelId,
  async (id, prevId) => {
    isEmittingTyping.value = false;
    emitTypingStopForChannel(prevId);
    clearTypingPulse();
    cancelPendingDraftSave();
    activeSchedule.value = null;
    pendingAttachments.value = [];
    suppressTypingSignals.value = false;
  },
  { flush: "post" },
);
</script>

<template>
  <div
    class="flex:col-md flex min-h-0 max-h-[50vh] flex-col overflow-hidden p-3 border border-zinc-200 rounded-xl bg-white focus-within:outline outline-1 outline-zinc-300/60"
    @click="editor?.commands.focus()"
  >
    <div
      v-if="quotedMessage && !editingMessage"
      class="flex:row-md flex:center-y shrink-0 gap-2 mb-2 pb-2 border-b border-zinc-200/80 text-xs text-muted-foreground"
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
    <div class="min-h-0 flex-auto overflow-y-auto overflow-x-hidden py-0.5 font-lato">
      <RichTextComposer
        :mentionables="mentionables"
        :me-id="meId"
        :placeholder="composerPlaceholder"
        @update:editor="onRichTextEditorUpdate"
        @pasted-files="onRichTextPastedFiles"
        @submit="onSendMessage"
      />
    </div>
    <input ref="stagingFileInputRef" type="file" class="sr-only" multiple @change="onStagingFilesSelected" />
    <div
      v-if="pendingAttachments.length || scheduleAttachmentHint"
      class="shrink-0 border-t border-zinc-200/80 pt-2"
      @click.stop
    >
      <MessageAttachments
        :files="pendingAttachments"
        :disabled="!!activeSchedule"
        :removable="true"
        :hint="scheduleAttachmentHint"
        @remove="removeStagingAttachment"
      />
    </div>

    <div class="flex:row-md flex:center-y mt-2 shrink-0 text-secondary-foreground">
      <MessageComposerActions :editor="editor" />

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
          <span class="text-xs ml-1 text-red-400">{{ formatTime(secondsElapsed) }}</span>
        </template>
      </Button>

      <template v-if="!editingMessage && channelId != null">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Attach files"
          class="shrink-0 mr-0.5"
          aria-label="Attach files"
          @click.stop="openStagingFilePicker()"
        >
          <Paperclip class="size-5" />
        </Button>
        <ButtonGroup>
          <Button
            type="button"
            variant="default"
            size="sm"
            class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
            @click="onSendMessage"
          >
            <Icon name="io-paper-plane" />
            {{ activeSchedule ? "Schedule" : "Send" }}
          </Button>
          <ButtonGroupSeparator
            class="!m-0 !w-px !min-w-px shrink-0 self-stretch border-0 bg-white/70"
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
        @click="onSendMessage"
      >
        <Icon name="io-paper-plane" />
        {{ editingMessage ? "Save" : "Send" }}
      </Button>
    </div>
    <ScheduleMessageCustomDialog v-model:open="customScheduleOpen" @confirm="onCustomScheduleConfirm" />
  </div>
</template>
