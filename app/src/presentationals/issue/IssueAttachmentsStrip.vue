<script lang="ts" setup>
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system";
import { cn } from "@/design-system/utils.js";
import type { AsyncDataView } from "@/lib/async";
import type { IssueAttachmentTileRow } from "@/lib/issues";
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import { ChevronDown, ChevronRight, Paperclip } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import IssueAttachmentTilesList from "./IssueAttachmentTilesList.vue";

function dragHasFiles(dt: DataTransfer | null): boolean {
  if (!dt?.types) return false;
  return [...dt.types].includes("Files");
}

const props = withDefaults(
  defineProps<{
    attachments: AsyncDataView<IssueAttachmentTileRow[]>;
    compact?: boolean;
    hideHeading?: boolean;
    meId?: number | null;
    /** Show dashed drop overlay when files are dragged over (parent handles upload). */
    droppable?: boolean;
    /** Disables drop UI while uploads run (from composable). */
    uploadInProgress?: boolean;
    /** Attachment id being removed (container tracks async mutation). */
    removingAttachmentId?: number | null;
    /** When true, expand on mount / when attachments appear. */
    defaultOpen?: boolean;
  }>(),
  {
    compact: false,
    hideHeading: false,
    meId: null,
    droppable: false,
    uploadInProgress: false,
    removingAttachmentId: null,
    defaultOpen: undefined,
  },
);

const emit = defineEmits<{
  remove: [attachmentId: number];
  dismissPending: [clientId: string];
  filesDropped: [files: File[]];
}>();

const confirmDialog = useConfirmDialog();
const dragDepth = ref(0);
const open = ref(false);

const attachmentCount = computed(() => props.attachments.data?.length ?? 0);

const shouldDefaultOpen = computed(() => {
  if (props.defaultOpen != null) return props.defaultOpen;
  return attachmentCount.value > 0 || props.uploadInProgress;
});

// Auto-open when there is something to show; never force-close.
watch(
  shouldDefaultOpen,
  (v) => {
    if (v) open.value = true;
  },
  { immediate: true },
);

const dropBlocked = computed(() => props.uploadInProgress || !props.droppable);

const isDragActive = computed(
  () => dragDepth.value > 0 && props.droppable === true && !props.uploadInProgress,
);

/** Drop target needs room when expanded or while a file drag is over the strip. */
const needsDropHeight = computed(() => props.droppable && (open.value || isDragActive.value));

const summary = computed(() => String(attachmentCount.value));

function onDragEnter(e: DragEvent) {
  if (dropBlocked.value) return;
  if (!dragHasFiles(e.dataTransfer)) return;
  e.preventDefault();
  dragDepth.value++;
  open.value = true;
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
  emit("remove", id);
}

const shellClass = computed(() =>
  [
    "relative flex flex-col outline-none transition-colors min-w-0",
    props.compact
      ? "rounded-lg border border-border/80 bg-muted/10"
      : "rounded-lg border border-border bg-muted/20",
    needsDropHeight.value ? "min-h-[7rem]" : "",
    isDragActive.value
      ? "border-primary/50 bg-muted/30 ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
      : "",
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
      :class="
        cn(
          'absolute inset-0 z-10 flex:col-lg flex:center px-4 py-6 text-center pointer-events-none',
          'rounded-md border-2 border-dashed border-primary/45 bg-background/60 backdrop-blur-[2px]',
        )
      "
      aria-live="polite"
    >
      <span class="text-sm font-medium text-foreground">Drop files to upload</span>
      <span class="text-xs text-muted-foreground">Release to add them to this issue</span>
    </div>

    <Collapsible v-model:open="open" class="min-w-0">
      <div :class="['flex items-center h-10 px-2 min-w-0', isDragActive ? 'opacity-40' : '']">
        <CollapsibleTrigger as-child>
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-secondary-foreground select-none hover:text-foreground"
          >
            <ChevronDown v-if="open" class="size-3 shrink-0" />
            <ChevronRight v-else class="size-3 shrink-0" />
            <Paperclip class="size-3.5 shrink-0 text-muted-foreground" />
            <small v-if="!hideHeading" class="font-medium text-foreground">Files</small>
            <small class="text-xs tabular-nums text-muted-foreground">{{ summary }}</small>
          </button>
        </CollapsibleTrigger>
        <span v-if="uploadInProgress" class="shrink-0 pr-2 text-xs text-muted-foreground"> Uploading… </span>
      </div>

      <CollapsibleContent>
        <div
          :class="[
            'flex flex-col gap-2',
            compact ? 'px-2 pb-2' : 'px-3 pb-2.5',
            isDragActive ? 'opacity-40' : '',
          ]"
        >
          <div v-if="attachments.error" class="text-xs text-red-600">{{ attachments.error }}</div>
          <div v-else-if="attachments.loading && attachmentCount === 0" class="text-xs text-muted-foreground">
            Loading attachments…
          </div>
          <div
            v-else-if="attachmentCount > 0"
            class="max-h-[min(40vh,28rem)] overflow-y-auto overscroll-contain pr-0.5"
          >
            <IssueAttachmentTilesList
              removable
              :me-id="meId ?? null"
              :disabled="removingAttachmentId != null || uploadInProgress"
              :rows="attachments.data ?? []"
              @remove="removeAttachment($event)"
              @dismiss-pending="emit('dismissPending', $event)"
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
      </CollapsibleContent>
    </Collapsible>
  </section>
</template>
