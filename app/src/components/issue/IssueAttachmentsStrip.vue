<script lang="ts" setup>
import { useConfirmDialog } from "@/components/confirm-dialog";
import IssueAttachmentTilesList from "@/components/issue/IssueAttachmentTilesList.vue";
import type { IssueAttachmentTileRow } from "@/domain/issues/composables/issue-attachments";
import { computed, ref } from "vue";

function dragHasFiles(dt: DataTransfer | null): boolean {
  if (!dt?.types) return false;
  return [...dt.types].includes("Files");
}

const props = withDefaults(
  defineProps<{
    rows: IssueAttachmentTileRow[];
    loading?: boolean;
    error?: string | null;
    compact?: boolean;
    hideHeading?: boolean;
    meId?: number | null;
    /** Show dashed drop overlay when files are dragged over (parent handles upload). */
    droppable?: boolean;
    /** Disables drop UI while uploads run (from composable). */
    uploadInProgress?: boolean;
    removeFile: (attachmentId: number) => Promise<void>;
    dismissPendingUpload: (clientId: string) => void;
  }>(),
  {
    loading: false,
    error: null,
    compact: false,
    hideHeading: false,
    meId: null,
    droppable: false,
    uploadInProgress: false,
  },
);

const emit = defineEmits<{
  filesDropped: [files: File[]];
}>();

const confirmDialog = useConfirmDialog();
const removingId = ref<number | null>(null);
const dragDepth = ref(0);

const dropBlocked = computed(() => props.uploadInProgress || !props.droppable);

const isDragActive = computed(
  () => dragDepth.value > 0 && props.droppable === true && !props.uploadInProgress,
);

function onDragEnter(e: DragEvent) {
  if (dropBlocked.value) return;
  if (!dragHasFiles(e.dataTransfer)) return;
  e.preventDefault();
  dragDepth.value++;
}

function onDragLeave(e: DragEvent) {
  if (!props.droppable) return;
  e.preventDefault();
  dragDepth.value = Math.max(0, dragDepth.value - 1);
}

function onDragOver(e: DragEvent) {
  if (dropBlocked.value) return;
  if (!dragHasFiles(e.dataTransfer)) return;
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
}

function onDrop(e: DragEvent) {
  if (dropBlocked.value) return;
  e.preventDefault();
  dragDepth.value = 0;
  const raw = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
  const files = raw.filter((f) => f.size > 0);
  if (files.length > 0) {
    emit("filesDropped", files);
  }
}

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
    /* parent surfaces errors */
  } finally {
    removingId.value = null;
  }
}

const shellClass = computed(() =>
  [
    "relative flex flex-col gap-2 outline-none transition-colors",
    props.compact
      ? "rounded-lg border border-border/80 bg-muted/10 px-2 py-2"
      : "rounded-lg border border-border bg-muted/20 px-3 py-2.5",
    props.droppable ? "min-h-[7rem]" : "",
    isDragActive.value ? "border-primary/50 bg-muted/30 ring-2 ring-primary/25 ring-offset-2 ring-offset-background" : "",
  ].join(" "),
);
</script>

<template>
  <section
    :class="shellClass"
    tabindex="-1"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div
      v-if="isDragActive"
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary/45 bg-background/80 px-4 py-6 text-center backdrop-blur-[2px]"
      aria-live="polite"
    >
      <span class="text-sm font-medium text-foreground">Drop files to upload</span>
      <span class="text-xs text-muted-foreground">Release to add them to this issue</span>
    </div>

    <div :class="['flex flex-col gap-2', isDragActive ? 'opacity-40' : '']">
      <div v-if="!hideHeading" class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-foreground">Files</h3>
        <span v-if="uploadInProgress" class="text-xs text-muted-foreground"> Uploading… </span>
      </div>
      <div v-if="error" class="text-xs text-red-600">{{ error }}</div>
      <div v-else-if="loading && rows.length === 0" class="text-xs text-muted-foreground">
        Loading attachments…
      </div>
      <div v-else-if="rows.length" class="max-h-[min(40vh,28rem)] overflow-y-auto overscroll-contain pr-0.5">
        <IssueAttachmentTilesList
          removable
          :me-id="meId ?? null"
          :disabled="removingId !== null || uploadInProgress"
          :rows="rows"
          @remove="removeAttachment($event)"
          @dismiss-pending="dismissPendingUpload($event)"
        />
      </div>
      <p v-else class="text-xs text-muted-foreground">
        {{
          droppable
            ? "No attachments yet — drag files here or drop them below when browsing."
            : "No attachments on this issue yet."
        }}
      </p>
    </div>
  </section>
</template>
