<script lang="ts" setup>
import { useConfirmDialog } from "@/components/confirm-dialog";
import { MessageAttachments } from "@/components/messages";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi, type UploadedAttachment } from "@/domain/issues/api";
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    issueId: number;
    /** Sidebar: no heavy border, optional title */
    compact?: boolean;
    hideHeading?: boolean;
  }>(),
  {
    compact: false,
    hideHeading: false,
  },
);

const issueApi = useDependency(IssueApi);
const confirmDialog = useConfirmDialog();
const attachments = ref<UploadedAttachment[]>([]);
const loading = ref(false);
const removingId = ref<number | null>(null);
const error = ref<string | null>(null);

watch(
  () => props.issueId,
  async (id) => {
    loading.value = true;
    error.value = null;
    try {
      attachments.value = await issueApi.listIssueAttachments(id);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Could not load files";
      attachments.value = [];
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

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
  error.value = null;
  try {
    await issueApi.deleteIssueAttachment(props.issueId, id);
    attachments.value = attachments.value.filter((a) => a.id !== id);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "Could not remove file";
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
    <div
      v-else-if="attachments.length"
      class="max-h-[min(40vh,28rem)] overflow-y-auto overscroll-contain pr-0.5"
    >
      <MessageAttachments
        removable
        :disabled="removingId !== null"
        :files="attachments"
        @remove="removeAttachment"
      />
    </div>
    <p v-else class="text-xs text-muted-foreground">No attachments on this issue yet.</p>
  </section>
</template>
