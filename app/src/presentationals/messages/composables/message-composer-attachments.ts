import type { AttachmentTileRow } from "@/presentationals/messages/attachment-tile-rows";
import type { IMessageAttachment } from "@epicstory/contracts";
import type { UploadedAttachment } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import type { Ref } from "vue";
import { computed, ref, shallowRef, watch } from "vue";
import type { ReadonlyRefOrGetter } from "@/utils";
import { toValue } from "@/utils";
import type { MessageComposerAttachmentHandlers } from "@/containers/messages/message-composer-attachment-handlers";
import type { ResolvedSchedule } from "../schedule-builders";

type EditingMessage = {
  id: number;
  content: JSONContent;
  attachments?: IMessageAttachment[];
} | null;

type PendingComposerTransfer =
  | { clientId: string; status: "uploading"; file: File; previewUrl: string }
  | {
      clientId: string;
      status: "failed";
      file: File;
      previewUrl: string;
      message?: string;
    };

function revokePendingEntries(entries: PendingComposerTransfer[]) {
  for (const e of entries) {
    URL.revokeObjectURL(e.previewUrl);
  }
}

export function useMessageComposerAttachments(options: {
  channelId: ReadonlyRefOrGetter<number>;
  editingMessage: ReadonlyRefOrGetter<EditingMessage>;
  attachmentHandlers: ReadonlyRefOrGetter<MessageComposerAttachmentHandlers>;
  activeSchedule: Ref<ResolvedSchedule | null>;
  onExistingAttachmentRemoved: () => void;
}) {
  const editingExistingAttachments = ref<IMessageAttachment[]>([]);
  const removingEditingAttachment = ref(false);
  const pendingAttachments = ref<UploadedAttachment[]>([]);
  const pendingTransfers = shallowRef<PendingComposerTransfer[]>([]);
  const stagingFileInputRef = ref<HTMLInputElement | null>(null);

  const scheduleAttachmentHint = computed(() =>
    options.activeSchedule.value && (pendingAttachments.value.length > 0 || pendingTransfers.value.length > 0)
      ? "Attachments are not sent in scheduled messages. Clear the schedule or send now to include them."
      : null,
  );

  const attachmentsStagingUploading = computed(() =>
    pendingTransfers.value.some((p) => p.status === "uploading"),
  );

  const attachmentsStagingHasFailed = computed(() =>
    pendingTransfers.value.some((p) => p.status === "failed"),
  );

  const attachmentsStagingBlocked = computed(
    () => attachmentsStagingUploading.value || attachmentsStagingHasFailed.value,
  );

  const stagingAttachmentRows = computed((): AttachmentTileRow[] => {
    const transferRows: AttachmentTileRow[] = pendingTransfers.value.map((p) =>
      p.status === "uploading"
        ? {
            key: `t:${p.clientId}`,
            kind: "uploading",
            clientId: p.clientId,
            file: p.file,
            previewUrl: p.previewUrl,
          }
        : {
            key: `t:${p.clientId}`,
            kind: "failed",
            clientId: p.clientId,
            file: p.file,
            previewUrl: p.previewUrl,
            message: p.message,
          },
    );
    const stagedRows: AttachmentTileRow[] = pendingAttachments.value.map((a) => ({
      key: `s:${a.id}`,
      kind: "uploaded",
      attachment: a,
    }));
    return [...transferRows, ...stagedRows];
  });

  const editingAttachmentRows = computed((): AttachmentTileRow[] =>
    editingExistingAttachments.value.map((a) => ({
      key: `e:${a.id}`,
      kind: "uploaded",
      attachment: a,
    })),
  );

  function dismissPendingTransfer(clientId: string) {
    const entry = pendingTransfers.value.find((p) => p.clientId === clientId);
    if (entry) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    pendingTransfers.value = pendingTransfers.value.filter((p) => p.clientId !== clientId);
  }

  function revokeAndRemoveTransfer(clientId: string) {
    const entry = pendingTransfers.value.find((p) => p.clientId === clientId);
    if (entry) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    pendingTransfers.value = pendingTransfers.value.filter((p) => p.clientId !== clientId);
  }

  async function uploadStagingFiles(fileList: File[]) {
    if (!fileList.length) return;
    const handlers = toValue(options.attachmentHandlers);
    const additions: PendingComposerTransfer[] = fileList.map((file) => ({
      clientId: crypto.randomUUID(),
      status: "uploading",
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    pendingTransfers.value = [...additions, ...pendingTransfers.value];

    await Promise.all(
      additions.map(async (entry) => {
        try {
          const dto = await handlers.uploadOne(entry.file);
          pendingAttachments.value = [...pendingAttachments.value, dto];
          revokeAndRemoveTransfer(entry.clientId);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Upload failed";
          pendingTransfers.value = pendingTransfers.value.map((p) =>
            p.clientId === entry.clientId && p.status === "uploading"
              ? { ...p, status: "failed" as const, message }
              : p,
          );
        }
      }),
    );
  }

  function openStagingFilePicker() {
    stagingFileInputRef.value?.click();
  }

  async function onStagingFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const raw = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (!raw.length) return;
    await uploadStagingFiles(raw);
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

  function resetStagingTransfers() {
    revokePendingEntries(pendingTransfers.value);
    pendingTransfers.value = [];
  }

  watch(
    () => toValue(options.channelId),
    () => {
      revokePendingEntries(pendingTransfers.value);
      pendingTransfers.value = [];
      pendingAttachments.value = [];
    },
    { flush: "post" },
  );

  watch(
    () => toValue(options.editingMessage),
    (msg) => {
      revokePendingEntries(pendingTransfers.value);
      pendingTransfers.value = [];
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
    editingAttachmentRows,
    removingEditingAttachment,
    pendingAttachments,
    stagingAttachmentRows,
    attachmentsStagingUploading,
    attachmentsStagingHasFailed,
    attachmentsStagingBlocked,
    pendingTransfers,
    stagingFileInputRef,
    scheduleAttachmentHint,
    uploadStagingFiles,
    dismissPendingTransfer,
    resetStagingTransfers,
    openStagingFilePicker,
    onStagingFilesSelected,
    removeStagingAttachment,
    onRemoveEditingAttachment,
  };
}
