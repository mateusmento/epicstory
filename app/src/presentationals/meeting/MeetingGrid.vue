<script setup lang="ts">
import { Button } from "@/design-system";
import { cn } from "@/design-system/utils";
import type { MeetingGridLayoutView, MeetingParticipant } from "@/lib/meetings";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import MeetingTile from "./MeetingTile.vue";
import { useGridPagination } from "@/presentationals/meeting/composables/useGridPagination";

const props = defineProps<{
  layout: MeetingGridLayoutView;
  class?: string;
}>();

const page = defineModel<number>("page", { required: true });

const emit = defineEmits<{
  "toggle-pin": [participantId: string];
}>();

const containerEl = ref<HTMLElement | null>(null);

const MIN_TILE_WIDTH = 240;
const GAP_PX = 12;
const RESERVED_BOTTOM_PX = 96; // meeting controls overlay area

const { layout: pagination } = useGridPagination(
  containerEl,
  computed(() => props.layout.participants.length),
  {
    minTileWidthPx: MIN_TILE_WIDTH,
    gapPx: GAP_PX,
    aspectWidth: 16,
    aspectHeight: 9,
    reservedBottomPx: RESERVED_BOTTOM_PX,
  },
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.layout.participants.length / pagination.value.pageSize)),
);
const clampedPage = computed(() => Math.max(1, Math.min(page.value, totalPages.value)));

const visibleParticipants = computed(() => {
  const start = (clampedPage.value - 1) * pagination.value.pageSize;
  return props.layout.participants.slice(start, start + pagination.value.pageSize);
});

const disableAspectRatio = computed(
  () =>
    props.layout.participants.length <= 3 && pagination.value.pageSize === props.layout.participants.length,
);

watch([() => props.layout.participants.length, totalPages], () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
});

const rows = computed(() => {
  const cols = Math.max(1, pagination.value.cols);
  const list = visibleParticipants.value;
  const out: MeetingParticipant[][] = [];
  for (let i = 0; i < list.length; i += cols) out.push(list.slice(i, i + cols));
  return out;
});

function prevPage() {
  page.value = Math.max(1, clampedPage.value - 1);
}

function nextPage() {
  page.value = Math.min(totalPages.value, clampedPage.value + 1);
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
          :key="`${p.id}-${p.streamEpoch}`"
          class="shrink-0"
          :style="
            disableAspectRatio
              ? { width: `${pagination.tileW}px`, height: `${pagination.tileH}px` }
              : { width: `${pagination.tileW}px` }
          "
        >
          <MeetingTile
            tile-role="grid"
            variant="grid"
            :class="disableAspectRatio ? 'w-full h-full rounded-2xl' : 'w-full aspect-video rounded-2xl'"
            :participant="p"
            :audio-output-device-id="layout.audioOutputDeviceId"
            :speaking="layout.speakingIds.has(p.id)"
            :pinned="layout.pinnedId === p.id"
            :title="layout.pinnedId === p.id ? 'Unpin' : 'Pin (switches to Speaker focus)'"
            @click="emit('toggle-pin', p.id)"
          />
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="absolute left-1/2 -translate-x-1/2 bottom-20">
      <div
        class="mx-auto w-fit flex items-center gap-2 bg-black/60 text-white backdrop-blur border border-white/10 rounded-full px-2 py-1"
      >
        <Button size="icon" variant="ghost" :disabled="clampedPage <= 1" @click="prevPage">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <div class="text-xs text-muted-foreground tabular-nums px-1 select-none">
          Page {{ clampedPage }} / {{ totalPages }}
        </div>
        <Button size="icon" variant="ghost" :disabled="clampedPage >= totalPages" @click="nextPage">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </section>
</template>
