<script lang="ts" setup>
import { Button, ButtonGroup, ButtonGroupSeparator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { loadChannelDraft, useChannelTypingPulse, useWorkspaceOnline } from "@/domain/channels";
import { onlineUserIdsFrom, staticMentionView } from "@/containers/issue/map-issue-mention-view";
import MessageComposerPollSection from "@/presentationals/messages/MessageComposerPollSection.vue";
import MessageComposerShell from "@/presentationals/messages/MessageComposerShell.vue";
import ScheduleMessageCustomDialog from "@/presentationals/messages/ScheduleMessageCustomDialog.vue";
import ScheduleMessageDropdown from "@/presentationals/messages/ScheduleMessageDropdown.vue";
import { useMessageComposerCore } from "./use-message-composer-core";
import { useMessageComposerSchedule } from "@/presentationals/messages/composables/message-composer-schedule";
import type {
  ComposerToolbarView,
  MessageComposerAttachmentHandlers,
} from "@/presentationals/messages/message-composer.types";
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
import type { Editor, JSONContent } from "@tiptap/core";
import { ChevronDown } from "lucide-vue-next";
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

const mentionView = computed(() =>
  staticMentionView(props.mentionables ?? [], onlineUserIdsFrom(props.mentionables ?? [], isUserOnline)),
);

const composerPollBody = ref<MessagePollBody | null>(null);
const editor = shallowRef<Editor | null>(null);

const {
  suppressTypingSignals,
  maybeStartTypingPulse,
  emitTypingStop,
  runWithTypingSuppressedDuringEditorMutation,
} = useChannelTypingPulse({
  channelId: () => props.channelId,
  editor,
});

const { customScheduleOpen, activeSchedule, scheduleSummary, onCustomScheduleConfirm, clearActiveSchedule } =
  useMessageComposerSchedule({
    channelId: () => props.channelId,
    getEditor: () => editor.value,
    editingMessage: () => props.editingMessage,
  });

const core = useMessageComposerCore({
  editor,
  channelId: () => props.channelId,
  editingMessage: () => props.editingMessage,
  quotedMessage: () => props.quotedMessage,
  placeholder: () => props.placeholder,
  attachmentHandlers: () => props.attachmentHandlers,
  activeSchedule,
  features: { poll: props.enableComposerPoll, schedule: true },
  composerPollBody: props.enableComposerPoll ? composerPollBody : undefined,
  onExistingAttachmentRemoved: () => emit("existing-attachment-removed"),
  onSubmitEdit: (body) => {
    if (!props.editingMessage) return;
    emit("submit-edit", props.editingMessage.id, body);
  },
  onSend: (body) => emit("send-message", body),
  onSendScheduled: (body) => emit("send-scheduled-message", body),
  onAfterSend: () => emitTypingStop(),
  draftExtensions: {
    runWithEditorMutationSuppressed: (fn) => runWithTypingSuppressedDuringEditorMutation(fn),
    whenEditorMissingAfterChannelChange: () => {
      suppressTypingSignals.value = false;
    },
    getPollDraft: props.enableComposerPoll ? () => composerPollBody.value ?? null : undefined,
    onDraftRestored: props.enableComposerPoll
      ? (draft) => {
          if (props.editingMessage) return;
          composerPollBody.value = draft?.poll ?? null;
        }
      : undefined,
  },
  editorListeners: {
    onUpdateExtra: () => {
      if (editor.value) maybeStartTypingPulse(editor.value);
    },
    onBlur: () => emitTypingStop(),
  },
});

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

watch(
  composerPollBody,
  () => {
    if (!props.enableComposerPoll || props.editingMessage) return;
    core.scheduleDraftSave(editor.value?.getJSON());
  },
  { deep: true },
);

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

const toolbar = computed(
  (): ComposerToolbarView => ({
    isEditing: !!props.editingMessage,
    isRecording: core.isRecording.value,
    recordingLabel: core.formatRecordingElapsed(core.secondsElapsed.value),
    sendLabel: activeSchedule.value ? "Schedule" : "Send",
    attachmentsBlocked: core.attachmentsView.value.stagingBlocked,
    scheduleSummary: props.editingMessage ? null : scheduleSummary.value,
    showPollToggle: props.enableComposerPoll,
    pollActive: composerPollBody.value != null,
  }),
);
</script>

<template>
  <MessageComposerShell
    :mention="mentionView"
    :me-id="meId"
    :placeholder="core.composerPlaceholder.value"
    :quote="core.quoteView.value"
    :show-quote="core.showQuote.value"
    :attachments="core.attachmentsView.value"
    :toolbar="toolbar"
    :editor="editor"
    @clear-quote="emit('clear-quote')"
    @cancel-edit="emit('cancel-edit')"
    @send="core.onSendMessage"
    @toggle-recording="core.onToggleRecording"
    @toggle-poll="toggleComposerPoll"
    @clear-schedule="clearActiveSchedule"
    @remove-editing-attachment="core.onRemoveEditingAttachment($event)"
    @remove-staging-attachment="core.removeStagingAttachment($event)"
    @dismiss-pending="core.dismissPendingTransfer($event)"
    @update:editor="core.onRichTextEditorUpdate"
    @pasted-files="core.onRichTextPastedFiles"
    @staging-files-selected="core.onStagingFilesSelected"
    @inline-image-selected="core.onInlineImageFilesSelected"
  >
    <template v-if="enableComposerPoll" #poll>
      <MessageComposerPollSection :model-value="composerPollBody" @update:model-value="setComposerPollBody" />
    </template>

    <template v-if="channelId != null" #sendTrailing>
      <ButtonGroup>
        <Button
          type="button"
          variant="default"
          size="sm"
          class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
          :disabled="toolbar.attachmentsBlocked"
          @click="core.onSendMessage"
        >
          <Icon name="io-paper-plane" />
          {{ toolbar.sendLabel }}
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
            :disabled="toolbar.attachmentsBlocked"
          >
            <ChevronDown class="w-4 h-4" />
          </Button>
        </ScheduleMessageDropdown>
      </ButtonGroup>
    </template>

    <template #dialogs>
      <ScheduleMessageCustomDialog v-model:open="customScheduleOpen" @confirm="onCustomScheduleConfirm" />
    </template>
  </MessageComposerShell>
</template>
