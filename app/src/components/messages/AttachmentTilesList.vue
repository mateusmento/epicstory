<script lang="ts" setup>
import type { AttachmentMediaState, AttachmentTileRow } from "@/components/messages/attachment-tile-rows";
import AttachmentMediaTile from "@/components/messages/AttachmentMediaTile.vue";
import type { IMessageAttachment } from "@epicstory/contracts";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { isImageMime, isVideoMime } from "@/components/messages/attachment-media-guards";
import { openAttachmentLightbox } from "@/components/messages/media-attachment-lightbox";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    rows: AttachmentTileRow[];
    disabled?: boolean;
    removable?: boolean;
    meId?: number | null;
    ariaLabel?: string;
  }>(),
  {
    disabled: false,
    removable: false,
    meId: null,
    ariaLabel: "Attachments",
  },
);

const emit = defineEmits<{
  remove: [attachmentId: number];
  dismissPending: [clientId: string];
}>();

const removeHoverCardContentClass = cn(
  "flex flex:center z-50 size-5 rounded-full border-0 p-0 max-w-none bg-transparent outline-none",
  "bg-zinc-800 leading-none shadow-md ring-1 ring-black/25 hover:bg-zinc-950 ",
  "disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-950 dark:ring-white/15 dark:hover:bg-black",
);

const rootClass = computed(() =>
  ["flex flex-wrap gap-2 pt-1", props.disabled ? "opacity-50 pointer-events-none grayscale-[0.35]" : ""].join(
    " ",
  ),
);

const uploadedForLightbox = computed(() =>
  props.rows
    .filter((r): r is AttachmentTileRow & { kind: "uploaded" } => r.kind === "uploaded")
    .map((r) => r.attachment),
);

function mediaState(row: AttachmentTileRow): AttachmentMediaState {
  if (row.kind === "uploaded") {
    return { variant: "uploaded", file: row.attachment };
  }
  if (row.kind === "uploading") {
    return {
      variant: "uploading",
      previewUrl: row.previewUrl,
      mimeType: row.file.type || "application/octet-stream",
      originalFilename: row.file.name,
    };
  }
  return {
    variant: "failed",
    previewUrl: row.previewUrl,
    mimeType: row.file.type || "application/octet-stream",
    originalFilename: row.file.name,
    message: row.message,
  };
}

function canRemoveUploaded(item: IMessageAttachment): boolean {
  if (!props.removable) return false;
  if (props.meId == null) return true;
  return item.uploadedById != null && item.uploadedById === props.meId;
}

async function onOpenPreview(row: AttachmentTileRow & { kind: "uploaded" }, thumbElement: HTMLElement) {
  const file = row.attachment;
  if (!isImageMime(file.mimeType) && !isVideoMime(file.mimeType, file.originalFilename)) return;
  await openAttachmentLightbox(uploadedForLightbox.value, file, thumbElement);
}
</script>

<template>
  <ul :class="rootClass" :aria-label="ariaLabel">
    <li v-for="row in rows" :key="row.key" class="flex max-w-[11rem] flex-shrink-0 flex-col gap-1 relative">
      <HoverCard
        v-if="row.kind === 'uploaded' && canRemoveUploaded(row.attachment)"
        :open-delay="150"
        :close-delay="120"
      >
        <HoverCardTrigger as-child>
          <div
            class="block w-full cursor-default rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <AttachmentMediaTile :state="mediaState(row)" @open-preview="onOpenPreview(row, $event)" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          as-child
          side="top"
          align="end"
          :side-offset="-12"
          :align-offset="-6"
          :class="removeHoverCardContentClass"
        >
          <button
            type="button"
            :disabled="disabled"
            title="Remove attachment"
            @click.stop="emit('remove', row.attachment.id)"
          >
            <Icon name="io-close" class="size-3 text-zinc-100" aria-hidden="true" />
          </button>
        </HoverCardContent>
      </HoverCard>
      <AttachmentMediaTile
        v-else-if="row.kind === 'uploaded'"
        :state="mediaState(row)"
        @open-preview="onOpenPreview(row, $event)"
      />
      <AttachmentMediaTile v-else :state="mediaState(row)" />
      <button
        v-if="row.kind === 'failed'"
        type="button"
        :disabled="disabled"
        class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow ring-1 ring-border hover:bg-muted hover:text-foreground"
        title="Dismiss"
        @click="emit('dismissPending', row.clientId)"
      >
        <Icon name="io-close" class="size-3.5" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>
