<script lang="ts" setup>
import { useMessageComposerCore } from "@/containers/messages/use-message-composer-core";
import MessageComposerShell from "@/presentationals/messages/MessageComposerShell.vue";
import type {
  ComposerToolbarView,
  MessageComposerAttachmentHandlers,
} from "@/presentationals/messages/message-composer.types";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import type { ResolvedSchedule } from "@/presentationals/messages/schedule-builders";
import type {
  IMessage,
  IReply,
  ReplyMessageBody,
  SendMessageBody,
  UpdateChannelMessageBody,
} from "@epicstory/contracts";
import { computed, ref } from "vue";

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

const activeSchedule = ref<ResolvedSchedule | null>(null);

const core = useMessageComposerCore({
  channelId: () => props.channelId,
  editingMessage: () => props.editingMessage,
  quotedMessage: () => props.quotedMessage,
  placeholder: () => props.placeholder,
  attachmentHandlers: () => props.attachmentHandlers,
  activeSchedule,
  features: { poll: false, schedule: false },
  onExistingAttachmentRemoved: () => emit("existing-attachment-removed"),
  onSubmitEdit: (body) => emit("submit-edit", body),
  onSend: (body) => emit("send-message", body),
});

const toolbar = computed(
  (): ComposerToolbarView => ({
    isEditing: !!props.editingMessage,
    isRecording: core.isRecording.value,
    recordingLabel: core.formatRecordingElapsed(core.secondsElapsed.value),
    sendLabel: "Send",
    attachmentsBlocked: core.attachmentsView.value.stagingBlocked,
    scheduleSummary: null,
    showPollToggle: false,
    pollActive: false,
  }),
);
</script>

<template>
  <MessageComposerShell
    :mention="mention"
    :me-id="meId"
    :placeholder="core.composerPlaceholder.value"
    :quote="core.quoteView.value"
    :show-quote="core.showQuote.value"
    :attachments="core.attachmentsView.value"
    :toolbar="toolbar"
    :editor="core.editor.value"
    @clear-quote="emit('clear-quote')"
    @cancel-edit="emit('cancel-edit')"
    @send="core.onSendMessage"
    @toggle-recording="core.onToggleRecording"
    @remove-editing-attachment="core.onRemoveEditingAttachment($event)"
    @remove-staging-attachment="core.removeStagingAttachment($event)"
    @dismiss-pending="core.dismissPendingTransfer($event)"
    @mention-load-more="emit('mention-load-more')"
    @update:editor="core.onRichTextEditorUpdate"
    @pasted-files="core.onRichTextPastedFiles"
    @staging-files-selected="core.onStagingFilesSelected"
    @inline-image-selected="core.onInlineImageFilesSelected"
  />
</template>
