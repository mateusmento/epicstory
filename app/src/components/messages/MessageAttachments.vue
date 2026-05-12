<script lang="ts" setup>
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { computed } from "vue";
import MessageAttachmentTileBody from "./MessageAttachmentTileBody.vue";
import { cn } from "@/design-system/utils";
import { isImageMime, isVideoMime } from "./attachment-media-guards";
import { openAttachmentLightbox } from "./media-attachment-lightbox";

const props = withDefaults(
  defineProps<{
    files: MessageAttachmentDto[];
    /** Tone down + block interaction (e.g. scheduled send). */
    disabled?: boolean;
    /** Show per-tile remove control (opens on hover via HoverCard). */
    removable?: boolean;
    /** When set with `removable`, only files uploaded by this user show remove. */
    meId?: number | null;
    /** Subtext under the strip (e.g. schedule policy). */
    hint?: string | null;
  }>(),
  {
    disabled: false,
    removable: false,
    meId: null,
    hint: null,
  },
);

const emit = defineEmits<{ (e: "remove", id: number): void }>();

const removeHoverCardContentClass = cn(
  "flex flex:center z-50 size-5 rounded-full border-0 p-0 max-w-none bg-transparent outline-none",
  "bg-zinc-800 leading-none shadow-md ring-1 ring-black/25 hover:bg-zinc-950 ",
  "disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-950 dark:ring-white/15 dark:hover:bg-black",
  // "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 ",
  // "data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
);

const rootClass = computed(() =>
  ["flex flex-wrap gap-2 pt-1", props.disabled ? "opacity-50 pointer-events-none grayscale-[0.35]" : ""].join(
    " ",
  ),
);

function canRemoveAttachment(f: MessageAttachmentDto): boolean {
  if (!props.removable) return false;
  if (props.meId == null) return true;
  return f.uploadedById != null && f.uploadedById === props.meId;
}

function onRemoveClick(id: number) {
  emit("remove", id);
}

async function onOpenPreview(file: MessageAttachmentDto, thumbElement: HTMLElement) {
  if (!isImageMime(file.mimeType) && !isVideoMime(file.mimeType, file.originalFilename)) return;
  await openAttachmentLightbox(props.files, file, thumbElement);
}
</script>

<template>
  <div v-if="files.length || hint" class="flex flex-col gap-1 mb-2">
    <p v-if="hint" class="text-[0.65rem] text-muted-foreground leading-snug">{{ hint }}</p>
    <ul :class="rootClass" aria-label="Attachments">
      <li v-for="f in files" :key="f.id" class="flex max-w-[11rem] flex-shrink-0 flex-col">
        <HoverCard v-if="canRemoveAttachment(f)" :open-delay="150" :close-delay="120">
          <HoverCardTrigger as-child>
            <div
              class="block w-full cursor-default rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <MessageAttachmentTileBody :file="f" @open-preview="onOpenPreview(f, $event)" />
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
              @click.stop="onRemoveClick(f.id)"
            >
              <Icon name="io-close" class="size-3 text-zinc-100" aria-hidden="true" />
            </button>
          </HoverCardContent>
        </HoverCard>
        <MessageAttachmentTileBody v-else :file="f" @open-preview="onOpenPreview(f, $event)" />
      </li>
    </ul>
  </div>
</template>
