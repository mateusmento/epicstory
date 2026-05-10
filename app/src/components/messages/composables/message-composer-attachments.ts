import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import type { UploadedAttachment } from "@/domain/channels/services/channel.service";
import type { JSONContent } from "@tiptap/core";
import type { Ref } from "vue";
import { computed, ref, watch } from "vue";
import type { ReadonlyRefOrGetter } from "@/utils";
import { toValue } from "@/utils";
import type { MessageComposerAttachmentHandlers } from "../message-composer-attachment-handlers";
import type { ResolvedSchedule } from "../schedule-builders";

type EditingMessage = {
  id: number;
  content: JSONContent;
  attachments?: MessageAttachmentDto[];
} | null;

export function useMessageComposerAttachments(options: {
  channelId: ReadonlyRefOrGetter<number>;
  editingMessage: ReadonlyRefOrGetter<EditingMessage>;
  attachmentHandlers: ReadonlyRefOrGetter<MessageComposerAttachmentHandlers>;
  activeSchedule: Ref<ResolvedSchedule | null>;
  onExistingAttachmentRemoved: () => void;
}) {
  const editingExistingAttachments = ref<MessageAttachmentDto[]>([]);
  const removingEditingAttachment = ref(false);
  const pendingAttachments = ref<UploadedAttachment[]>([]);
  const stagingFileInputRef = ref<HTMLInputElement | null>(null);

  const scheduleAttachmentHint = computed(() =>
    options.activeSchedule.value && pendingAttachments.value.length > 0
      ? "Attachments are not sent in scheduled messages. Clear the schedule or send now to include them."
      : null,
  );

  async function uploadStagingFiles(fileList: File[]) {
    if (!fileList.length) return;
    const uploaded = await toValue(options.attachmentHandlers).uploadFiles(fileList);
    if (uploaded.length > 0) {
      pendingAttachments.value = [...pendingAttachments.value, ...uploaded];
    }
  }

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

  async function onRemoveEditingAttachment(id: number) {
    removingEditingAttachment.value = true;
    try {
      await toValue(options.attachmentHandlers).removeLinkedAttachment(id);
      editingExistingAttachments.value = editingExistingAttachments.value.filter((a) => a.id !== id);
      options.onExistingAttachmentRemoved();
    } catch {
      /* non-blocking; list refetch can repair */
    } finally {
      removingEditingAttachment.value = false;
    }
  }

  watch(
    () => toValue(options.channelId),
    () => {
      pendingAttachments.value = [];
    },
    { flush: "post" },
  );

  watch(
    () => toValue(options.editingMessage),
    (msg) => {
      if (msg) {
        pendingAttachments.value = [];
        editingExistingAttachments.value = [...(msg.attachments ?? [])];
      } else {
        editingExistingAttachments.value = [];
      }
    },
  );

  return {
    editingExistingAttachments,
    removingEditingAttachment,
    pendingAttachments,
    stagingFileInputRef,
    scheduleAttachmentHint,
    uploadStagingFiles,
    openStagingFilePicker,
    onStagingFilesSelected,
    removeStagingAttachment,
    onRemoveEditingAttachment,
  };
}
