<script lang="ts" setup>
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { Icon } from "@/design-system/icons";

const props = defineProps<{ file: MessageAttachmentDto }>();

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function isVideo(mime: string, originalFilename: string) {
  if (mime.startsWith("video/")) return true;
  if (!mime || mime === "application/octet-stream") {
    return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(originalFilename ?? "");
  }
  return false;
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
    <template v-if="isImage(props.file.mimeType)">
      <img
        :src="props.file.url"
        :alt="props.file.originalFilename"
        class="h-20 w-full object-cover"
        loading="lazy"
      />
    </template>
    <template v-else-if="isVideo(props.file.mimeType, props.file.originalFilename)">
      <video
        :src="props.file.url"
        class="h-20 w-full object-cover bg-black"
        muted
        playsinline
        preload="metadata"
        :title="props.file.originalFilename"
      />
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
