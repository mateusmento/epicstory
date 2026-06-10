<script lang="ts" setup>
import { IssueAttachmentsStrip } from "@/presentationals/issue";
import { ref } from "vue";
import { useIssueAttachmentsContext } from "./issue-attachments.context";

const props = withDefaults(
  defineProps<{
    meId: number;
    compact?: boolean;
    hideHeading?: boolean;
    droppable?: boolean;
    reloadFeed?: () => Promise<void>;
  }>(),
  {
    compact: false,
    hideHeading: false,
    droppable: false,
  },
);

const {
  attachments,
  attachmentsUploading,
  removePersistedAttachment,
  dismissPendingUpload,
  uploadIssueAttachmentFiles,
} = useIssueAttachmentsContext();

const removingAttachmentId = ref<number | null>(null);

async function onRemove(id: number) {
  removingAttachmentId.value = id;
  try {
    await removePersistedAttachment(id);
  } finally {
    removingAttachmentId.value = null;
  }
}

async function onFilesDropped(files: File[]) {
  await uploadIssueAttachmentFiles(files);
}
</script>

<template>
  <IssueAttachmentsStrip
    :attachments="attachments"
    :me-id="meId"
    :compact="compact"
    :hide-heading="hideHeading"
    :droppable="droppable"
    :upload-in-progress="attachmentsUploading"
    :removing-attachment-id="removingAttachmentId"
    @remove="onRemove"
    @dismiss-pending="dismissPendingUpload"
    @files-dropped="onFilesDropped"
  />
</template>
