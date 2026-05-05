<script lang="ts" setup>
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { Icon } from "@/design-system/icons";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    files: MessageAttachmentDto[];
    /** Tone down + block interaction (e.g. scheduled send). */
    disabled?: boolean;
    /** Show per-tile remove control. */
    removable?: boolean;
    /** Subtext under the strip (e.g. schedule policy). */
    hint?: string | null;
  }>(),
  {
    disabled: false,
    removable: false,
    hint: null,
  },
);

const emit = defineEmits<{ (e: "remove", id: number): void }>();

const isImage = (mime: string) => mime.startsWith("image/");
const isVideo = (mime: string, originalFilename: string) => {
  if (mime.startsWith("video/")) return true;
  if (!mime || mime === "application/octet-stream") {
    return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(originalFilename ?? "");
  }
  return false;
};

function displayName(f: MessageAttachmentDto) {
  const n = f.originalFilename || "file";
  return n.length > 28 ? `${n.slice(0, 26)}…` : n;
}

const rootClass = computed(() =>
  ["flex flex-wrap gap-2 pt-1", props.disabled ? "opacity-50 pointer-events-none grayscale-[0.35]" : ""].join(
    " ",
  ),
);
</script>

<template>
  <div v-if="files.length || hint" class="flex flex-col gap-1">
    <p v-if="hint" class="text-[0.65rem] text-muted-foreground leading-snug">{{ hint }}</p>
    <ul :class="rootClass" aria-label="Attachments">
      <li
        v-for="f in files"
        :key="f.id"
        class="relative flex max-w-[11rem] flex-shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/40 text-left text-xs shadow-sm"
      >
        <div v-if="removable" class="absolute right-0.5 top-0.5 z-[1]">
          <button
            type="button"
            class="rounded-full bg-background/90 p-0.5 shadow-sm ring-1 ring-border hover:bg-muted"
            :disabled="disabled"
            title="Remove attachment"
            @click="emit('remove', f.id)"
          >
            <Icon name="io-close" class="size-3.5 text-muted-foreground" />
          </button>
        </div>
        <template v-if="isImage(f.mimeType)">
          <img :src="f.url" :alt="f.originalFilename" class="h-20 w-full object-cover" loading="lazy" />
        </template>
        <template v-else-if="isVideo(f.mimeType, f.originalFilename)">
          <video
            :src="f.url"
            class="h-20 w-full object-cover bg-black"
            muted
            playsinline
            preload="metadata"
            :title="f.originalFilename"
          />
        </template>
        <template v-else>
          <div class="flex items-start gap-2 p-2">
            <Icon name="fa-file-alt" class="mt-0.5 size-6 shrink-0 text-muted-foreground" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-foreground" :title="f.originalFilename">
                {{ displayName(f) }}
              </div>
              <div class="text-[0.65rem] text-muted-foreground">{{ f.mimeType || "File" }}</div>
            </div>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>
