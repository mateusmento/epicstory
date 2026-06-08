<script lang="ts" setup>
import type { AttachmentMediaState } from "@/presentationals/messages/attachment-tile-rows";
import MessageAttachmentTileBody from "@/presentationals/messages/MessageAttachmentTileBody.vue";
import { isImageMime, isVideoMime } from "@/presentationals/messages/attachment-media-guards";
import { Icon } from "@/design-system/icons";
import { AlertCircle, Loader2 } from "lucide-vue-next";

defineProps<{
  state: AttachmentMediaState;
}>();

const emit = defineEmits<{
  openPreview: [triggerElement: HTMLElement];
}>();
</script>

<template>
  <MessageAttachmentTileBody
    v-if="state.variant === 'uploaded'"
    :file="state.file"
    @open-preview="emit('openPreview', $event)"
  />
  <div
    v-else-if="state.variant === 'uploading'"
    class="relative w-full overflow-hidden rounded-lg border border-border text-left text-xs shadow-sm bg-muted/50"
  >
    <template v-if="isImageMime(state.mimeType)">
      <img
        :src="state.previewUrl"
        :alt="state.originalFilename"
        class="h-20 w-full object-cover opacity-70 grayscale"
        draggable="false"
      />
    </template>
    <template v-else-if="isVideoMime(state.mimeType, state.originalFilename)">
      <video
        :src="state.previewUrl"
        class="pointer-events-none h-20 w-full bg-black object-cover opacity-70 grayscale"
        muted
        playsinline
        preload="metadata"
      />
    </template>
    <template v-else>
      <div class="flex h-20 items-center gap-2 bg-muted/60 px-2 opacity-80 grayscale">
        <Icon name="fa-file-alt" class="size-6 shrink-0 text-muted-foreground" />
        <span class="min-w-0 truncate font-medium text-muted-foreground" :title="state.originalFilename">
          {{ state.originalFilename }}
        </span>
      </div>
    </template>
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/55 backdrop-blur-[1px]"
      aria-busy="true"
      aria-label="Uploading"
    >
      <Loader2 class="size-7 animate-spin text-muted-foreground" />
      <span class="sr-only">Uploading</span>
    </div>
  </div>
  <div
    v-else
    class="relative w-full overflow-hidden rounded-lg border border-border text-left text-xs shadow-sm bg-muted/50"
  >
    <template v-if="isImageMime(state.mimeType)">
      <img
        :src="state.previewUrl"
        :alt="state.originalFilename"
        class="h-20 w-full object-cover opacity-55 grayscale"
        draggable="false"
      />
    </template>
    <template v-else-if="isVideoMime(state.mimeType, state.originalFilename)">
      <video
        :src="state.previewUrl"
        class="pointer-events-none h-20 w-full bg-black object-cover opacity-55 grayscale"
        muted
        playsinline
        preload="metadata"
      />
    </template>
    <template v-else>
      <div class="flex h-20 items-center gap-2 bg-muted/70 px-2 opacity-90 grayscale">
        <Icon name="fa-file-alt" class="size-6 shrink-0 text-muted-foreground" />
        <span class="min-w-0 truncate font-medium text-muted-foreground" :title="state.originalFilename">
          {{ state.originalFilename }}
        </span>
      </div>
    </template>
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 px-2 text-center backdrop-blur-[1px]"
    >
      <AlertCircle class="size-6 shrink-0 text-destructive/90" aria-hidden="true" />
      <span class="line-clamp-2 text-[0.65rem] leading-tight text-destructive">
        {{ state.message ?? "Upload failed" }}
      </span>
    </div>
  </div>
</template>
