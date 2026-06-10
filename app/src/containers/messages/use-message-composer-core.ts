import {
  clearChannelDraft,
  composerQuoteRef,
  quotedMessageExcerpt,
  useChannelMessageDraft,
} from "@/domain/channels";
import {
  useMessageComposerAttachments,
  useMessageComposerEditingBody,
  useMessageComposerScreenRecording,
} from "@/presentationals/messages/composables";
import type {
  ComposerAttachmentsView,
  ComposerEditingView,
  ComposerFeatures,
  ComposerQuoteView,
  MessageComposerAttachmentHandlers,
} from "@/presentationals/messages/message-composer.types";
import type { ResolvedSchedule } from "@/presentationals/messages/schedule-builders";
import type { ReadonlyRefOrGetter } from "@/utils";
import { toValue } from "@/utils";
import type {
  CreateScheduledMessageBody,
  IMessage,
  IReply,
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
import type { Editor } from "@tiptap/core";
import { computed, shallowRef, watch, type Ref } from "vue";

export type MessageComposerDraftExtensions = {
  runWithEditorMutationSuppressed?: (fn: () => Promise<void>) => Promise<void>;
  whenEditorMissingAfterChannelChange?: () => void;
  getPollDraft?: () => MessagePollBody | null;
  onDraftRestored?: (draft: { poll?: MessagePollBody | null } | null) => void;
};

export type MessageComposerEditorListeners = {
  onUpdateExtra?: () => void;
  onBlur?: () => void;
};

export function useMessageComposerCore(options: {
  editor?: Ref<Editor | null>;
  channelId: ReadonlyRefOrGetter<number>;
  editingMessage: ReadonlyRefOrGetter<ComposerEditingView>;
  quotedMessage: ReadonlyRefOrGetter<(IMessage | IReply) | null>;
  placeholder?: ReadonlyRefOrGetter<string | undefined>;
  attachmentHandlers: ReadonlyRefOrGetter<MessageComposerAttachmentHandlers>;
  activeSchedule: Ref<ResolvedSchedule | null>;
  features: ComposerFeatures;
  composerPollBody?: Ref<MessagePollBody | null>;
  onExistingAttachmentRemoved: () => void;
  onSubmitEdit: (body: UpdateChannelMessageBody) => void;
  onSend: (body: ReplyMessageBody | SendMessageBody) => void;
  onSendScheduled?: (body: CreateScheduledMessageBody) => void;
  onAfterSend?: () => void;
  draftExtensions?: MessageComposerDraftExtensions;
  editorListeners?: MessageComposerEditorListeners;
}) {
  const editor = options.editor ?? shallowRef<Editor | null>(null);

  function onRichTextEditorUpdate(ed: Editor | null) {
    editor.value = ed;
  }

  const composerPlaceholder = computed(() =>
    toValue(options.editingMessage)
      ? "Edit message…"
      : ((options.placeholder ? toValue(options.placeholder) : undefined) ?? "Send a message…"),
  );

  const quoteView = computed((): ComposerQuoteView | null => {
    const quoted = toValue(options.quotedMessage);
    if (!quoted) return null;
    return {
      senderName: quoted.sender.name,
      excerpt: quotedMessageExcerpt(quoted),
    };
  });

  const showQuote = computed(() => quoteView.value != null && toValue(options.editingMessage) == null);

  const { scheduleDraftSave, cancelPendingDraftSave } = useChannelMessageDraft({
    channelId: options.channelId,
    editingMessage: options.editingMessage,
    editor,
    runWithEditorMutationSuppressed: options.draftExtensions?.runWithEditorMutationSuppressed,
    whenEditorMissingAfterChannelChange: options.draftExtensions?.whenEditorMissingAfterChannelChange,
    getPollDraft: options.draftExtensions?.getPollDraft,
    onDraftRestored: options.draftExtensions?.onDraftRestored,
  });

  function onEditorUpdateForDraft() {
    scheduleDraftSave(editor.value?.getJSON());
  }

  watch(
    editor,
    (ed, prevEd) => {
      if (prevEd) {
        prevEd.off("update", onEditorUpdateForDraft);
        prevEd.off("update", onEditorUpdateForTyping);
        prevEd.off("blur", onEditorBlur);
      }
      if (!ed) return;
      ed.on("update", onEditorUpdateForDraft);
      ed.on("update", onEditorUpdateForTyping);
      ed.on("blur", onEditorBlur);
    },
    { immediate: true },
  );

  function onEditorUpdateForTyping() {
    options.editorListeners?.onUpdateExtra?.();
  }

  function onEditorBlur() {
    options.editorListeners?.onBlur?.();
  }

  const {
    editingAttachmentRows,
    removingEditingAttachment,
    pendingAttachments,
    scheduleAttachmentHint,
    stagingAttachmentRows,
    attachmentsStagingBlocked,
    uploadStagingFiles,
    dismissPendingTransfer,
    resetStagingTransfers,
    onStagingFilesSelected,
    removeStagingAttachment,
    onRemoveEditingAttachment,
  } = useMessageComposerAttachments({
    channelId: options.channelId,
    editingMessage: options.editingMessage,
    attachmentHandlers: options.attachmentHandlers,
    activeSchedule: options.activeSchedule,
    onExistingAttachmentRemoved: options.onExistingAttachmentRemoved,
  });

  const { isRecording, secondsElapsed, onToggleRecording, formatRecordingElapsed } =
    useMessageComposerScreenRecording();

  useMessageComposerEditingBody({
    editor,
    editingMessage: options.editingMessage,
  });

  const attachmentsView = computed(
    (): ComposerAttachmentsView => ({
      editingRows: editingAttachmentRows.value,
      stagingRows: stagingAttachmentRows.value,
      scheduleHint: scheduleAttachmentHint.value,
      removingEditing: removingEditingAttachment.value,
      stagingBlocked: attachmentsStagingBlocked.value,
      stagingDisabled: !!toValue(options.activeSchedule) || attachmentsStagingBlocked.value,
    }),
  );

  function onRichTextPastedFiles(files: File[]) {
    uploadStagingFiles(files);
  }

  async function onInlineImageFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const raw = input.files ? Array.from(input.files) : [];
    input.value = "";
    const images = raw.filter((f) => f.type.startsWith("image/"));
    const ed = editor.value;
    if (!images.length || !ed) return;
    const uploaded = await toValue(options.attachmentHandlers).uploadFiles(images);
    for (const u of uploaded) {
      ed.chain()
        .focus()
        .setImage({ src: u.url, attachmentId: u.id } as never)
        .run();
    }
  }

  function normalizedComposerPoll(): MessagePollBody | undefined {
    if (!options.features.poll || !options.composerPollBody) return undefined;
    const b = options.composerPollBody.value;
    if (!b) return undefined;
    const question = b.question.trim();
    const pollOptions = b.options
      .map((o) => ({ id: o.id, label: o.label.trim() }))
      .filter((o) => o.label.length > 0);
    if (question.length === 0 || pollOptions.length < 2) return undefined;
    return { question, options: pollOptions };
  }

  function pollPayloadForEdit(): MessagePollBody | null | undefined {
    if (!options.features.poll || !options.composerPollBody) return undefined;
    const editing = toValue(options.editingMessage);
    if (!editing) return undefined;
    if (options.composerPollBody.value == null) {
      return editing.poll ? null : undefined;
    }
    return normalizedComposerPoll();
  }

  function onSendMessage() {
    if (!editor.value) return;
    if (attachmentsStagingBlocked.value) return;

    const doc = editor.value.getJSON();
    const stripped = stripImageNodesFromDoc(doc);
    const plain = tiptapToPlainText(stripped, { stripFormatting: true }).trim();
    const pollPayload = normalizedComposerPoll();
    const pollPanelIncomplete =
      options.features.poll &&
      options.composerPollBody != null &&
      options.composerPollBody.value != null &&
      pollPayload === undefined;

    if (pollPanelIncomplete) return;

    const hasBody = plain.length > 0 || docContainsImageNodes(doc);
    const hasPoll = pollPayload !== undefined;
    if (!hasBody && !hasPoll) return;

    const editing = toValue(options.editingMessage);
    if (editing) {
      const stagedIds = pendingAttachments.value.map((a) => a.id);
      const inlineIds = collectImageAttachmentIdsFromDoc(doc);
      const attachmentIds = [...new Set([...stagedIds, ...inlineIds])];
      const pollPatch = pollPayloadForEdit();
      options.onSubmitEdit({
        content: doc,
        ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
        ...(pollPatch !== undefined ? { poll: pollPatch } : {}),
      });
      pendingAttachments.value = [];
      resetStagingTransfers();
      if (options.composerPollBody) options.composerPollBody.value = null;
      options.onAfterSend?.();
      return;
    }

    const stagedIds = pendingAttachments.value.map((a) => a.id);
    const inlineIds = collectImageAttachmentIdsFromDoc(doc);
    const schedule = toValue(options.activeSchedule);
    const attachmentIds = schedule ? [] : [...new Set([...stagedIds, ...inlineIds])];
    const quoteRef = toValue(options.quotedMessage) ? composerQuoteRef(toValue(options.quotedMessage)!) : {};

    if (schedule && options.features.schedule && options.onSendScheduled) {
      options.onSendScheduled({
        content: doc,
        ...quoteRef,
        dueAt: schedule.dueAt.toISOString(),
        recurrence: schedule.recurrence,
        ...(pollPayload ? { poll: pollPayload } : {}),
      });
      options.activeSchedule.value = null;
    } else {
      options.onSend({
        content: doc,
        ...quoteRef,
        ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
        ...(pollPayload ? { poll: pollPayload } : {}),
      });
    }

    editor.value.commands.clearContent();
    pendingAttachments.value = [];
    resetStagingTransfers();
    if (options.composerPollBody) options.composerPollBody.value = null;
    options.onAfterSend?.();
    clearChannelDraft(toValue(options.channelId));
    cancelPendingDraftSave();
  }

  return {
    editor,
    composerPlaceholder,
    quoteView,
    showQuote,
    attachmentsView,
    isRecording,
    secondsElapsed,
    formatRecordingElapsed,
    onRichTextEditorUpdate,
    onRichTextPastedFiles,
    onInlineImageFilesSelected,
    onStagingFilesSelected,
    onToggleRecording,
    onSendMessage,
    onRemoveEditingAttachment,
    removeStagingAttachment,
    dismissPendingTransfer,
    scheduleDraftSave,
  };
}
