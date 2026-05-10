<script lang="ts" setup>
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { Icon } from "@/design-system/icons";
import { isImageMime, isVideoMime } from "./attachment-media-guards";

const props = defineProps<{ file: MessageAttachmentDto }>();

const emit = defineEmits<{ openPreview: [triggerElement: HTMLElement] }>();

function onOpenPreview(ev: MouseEvent) {
  const root = ev.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const media = root.querySelector("img, video");
  emit("openPreview", (media ?? root) as HTMLElement);
}

function displayName(f: MessageAttachmentDto) {
  const n = f.originalFilename || "file";
  return n.length > 28 ? `${n.slice(0, 26)}…` : n;
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-lg border border-border bg-muted/40 text-left text-xs shadow-sm"
  >
    <template v-if="isImageMime(props.file.mimeType)">
      <button
        type="button"
        class="relative block w-full cursor-zoom-in overflow-hidden p-0 text-left"
        @click.stop="onOpenPreview"
      >
        <img
          :src="props.file.url"
          :alt="props.file.originalFilename"
          class="h-20 w-full object-cover"
          loading="lazy"
        />
      </button>
    </template>
    <template v-else-if="isVideoMime(props.file.mimeType, props.file.originalFilename)">
      <button
        type="button"
        class="relative block w-full cursor-pointer overflow-hidden p-0 text-left"
        @click.stop="onOpenPreview"
      >
        <video
          :src="props.file.url"
          class="pointer-events-none h-20 w-full object-cover bg-black"
          muted
          playsinline
          preload="metadata"
          :title="props.file.originalFilename"
        />
      </button>
    </template>
    <template v-else>
      <div class="flex items-start gap-2 p-2">
        <Icon name="fa-file-alt" class="mt-0.5 size-6 shrink-0 text-muted-foreground" />
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium text-foreground" :title="props.file.originalFilename">
            {{ displayName(props.file) }}
          </div>
          <div class="text-[0.65rem] text-muted-foreground">{{ props.file.mimeType || "File" }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
