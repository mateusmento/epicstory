<script lang="ts" setup>
import { useConfirmDialog } from "@/components/confirm-dialog";
import { MessageAttachments } from "@/components/messages";
import type { UploadedAttachment } from "@/domain/issues/api";
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    files: UploadedAttachment[];
    loading?: boolean;
    error?: string | null;
    compact?: boolean;
    hideHeading?: boolean;
    meId?: number | null;
    removeFile: (attachmentId: number) => Promise<void>;
  }>(),
  {
    loading: false,
    error: null,
    compact: false,
    hideHeading: false,
    meId: null,
  },
);

const confirmDialog = useConfirmDialog();
const removingId = ref<number | null>(null);

async function removeAttachment(id: number) {
  const confirmed = await confirmDialog.open({
    title: "Remove this attachment?",
    description: "The file will be permanently deleted from this issue.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) {
    return;
  }
  removingId.value = id;
  try {
    await props.removeFile(id);
  } catch {
    /* error from parent */
  } finally {
    removingId.value = null;
  }
}
</script>

<template>
  <section
    :class="[
      'flex flex-col gap-2',
      compact
        ? 'rounded-lg border border-border/80 bg-muted/10 px-2 py-2'
        : 'rounded-lg border border-border bg-muted/20 px-3 py-2.5',
    ]"
  >
    <div v-if="!hideHeading" class="flex items-center justify-between gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-foreground">Files</h3>
    </div>
    <div v-if="error" class="text-xs text-red-600">{{ error }}</div>
    <div v-else-if="loading" class="text-xs text-muted-foreground">Loading attachments…</div>
    <div v-else-if="files.length" class="max-h-[min(40vh,28rem)] overflow-y-auto overscroll-contain pr-0.5">
      <MessageAttachments
        removable
        :me-id="meId ?? null"
        :disabled="removingId !== null"
        :files="files"
        @remove="removeAttachment"
      />
    </div>
    <p v-else class="text-xs text-muted-foreground">No attachments on this issue yet.</p>
  </section>
</template>
