<script setup lang="ts">
import { Button } from "@/design-system";
import { cn } from "@/design-system/utils";
import type { MeetingParticipant } from "@/domain/channels/composables/meeting-layout";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import MeetingTile from "./MeetingTile.vue";
import { useGridPagination } from "./composables/useGridPagination";

const props = defineProps<{
  participants: MeetingParticipant[];
  isSpeaking: (id: string) => boolean;
  pinnedId: string | null;
  onTogglePin: (id: string) => void;

  page: number;
  onSetPage: (page: number) => void;

  remoteAudioOutputDeviceId?: string | null;
  class?: string;
}>();

const containerEl = ref<HTMLElement | null>(null);

const MIN_TILE_WIDTH = 240;
const GAP_PX = 12;
const RESERVED_BOTTOM_PX = 96; // meeting controls overlay area

const { layout } = useGridPagination(
  containerEl,
  computed(() => props.participants.length),
  {
    minTileWidthPx: MIN_TILE_WIDTH,
    gapPx: GAP_PX,
    aspectWidth: 16,
    aspectHeight: 9,
    reservedBottomPx: RESERVED_BOTTOM_PX,
  },
);

const totalPages = computed(() => Math.max(1, Math.ceil(props.participants.length / layout.value.pageSize)));
const page = computed(() => Math.max(1, Math.min(props.page, totalPages.value)));

const visibleParticipants = computed(() => {
  const start = (page.value - 1) * layout.value.pageSize;
  return props.participants.slice(start, start + layout.value.pageSize);
});

const disableAspectRatio = computed(
  () => props.participants.length <= 3 && layout.value.pageSize === props.participants.length,
);

watch([() => props.participants.length, totalPages], () => {
  if (props.page > totalPages.value) props.onSetPage(totalPages.value);
});

const rows = computed(() => {
  const cols = Math.max(1, layout.value.cols);
  const list = visibleParticipants.value;
  const out: MeetingParticipant[][] = [];
  for (let i = 0; i < list.length; i += cols) out.push(list.slice(i, i + cols));
  return out;
});

function prevPage() {
  props.onSetPage(Math.max(1, page.value - 1));
}

function nextPage() {
  props.onSetPage(Math.min(totalPages.value, page.value + 1));
}
</script>

<template>
  <section ref="containerEl" :class="cn('relative flex-1 min-h-0 overflow-hidden', props.class)">
    <div class="h-full" :style="{ paddingBottom: `${RESERVED_BOTTOM_PX}px` }" style="contain: layout paint">
      <div
        v-for="(row, idx) in rows"
        :key="idx"
        class="flex justify-center"
        :style="{ gap: `${GAP_PX}px`, marginBottom: idx === rows.length - 1 ? '0px' : `${GAP_PX}px` }"
      >
        <div
          v-for="p in row"
          :key="p.id"
          class="shrink-0"
          :style="
            disableAspectRatio
              ? { width: `${layout.tileW}px`, height: `${layout.tileH}px` }
              : { width: `${layout.tileW}px` }
          "
        >
          <MeetingTile
            variant="grid"
            :class="disableAspectRatio ? 'w-full h-full rounded-2xl' : 'w-full aspect-video rounded-2xl'"
            :participant="p"
            :audio-output-device-id="remoteAudioOutputDeviceId"
            :speaking="isSpeaking(p.id)"
            :pinned="pinnedId === p.id"
            :title="pinnedId === p.id ? 'Unpin' : 'Pin (switches to Speaker focus)'"
            @click="onTogglePin(p.id)"
          />
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="absolute left-1/2 -translate-x-1/2 bottom-20">
      <div
        class="mx-auto w-fit flex items-center gap-2 bg-black/60 text-white backdrop-blur border border-white/10 rounded-full px-2 py-1"
      >
        <Button size="icon" variant="ghost" :disabled="page <= 1" @click="prevPage">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <div class="text-xs text-muted-foreground tabular-nums px-1 select-none">
          Page {{ page }} / {{ totalPages }}
        </div>
        <Button size="icon" variant="ghost" :disabled="page >= totalPages" @click="nextPage">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </section>
</template>
