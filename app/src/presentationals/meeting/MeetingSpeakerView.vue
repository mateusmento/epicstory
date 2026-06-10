<script setup lang="ts">
import { cn } from "@/design-system/utils";
import type { MeetingSpeakerLayoutView } from "@/lib/meetings";
import MeetingTile from "./MeetingTile.vue";

const props = defineProps<{
  layout: MeetingSpeakerLayoutView;
  class?: string;
}>();

const emit = defineEmits<{
  "toggle-pin": [participantId: string];
}>();
</script>

<template>
  <section :class="cn('flex flex-col flex-1 min-h-0 gap-3', props.class)">
    <!-- Top dock -->
    <div v-if="layout.topDockPeers.length" class="overflow-x-auto px-2">
      <div class="flex items-center justify-center gap-2 w-max min-w-full">
        <MeetingTile
          v-for="p in layout.topDockPeers"
          :key="`${p.id}-${p.streamEpoch}`"
          tile-role="dock"
          variant="dock"
          class="shrink-0 w-56 aspect-video rounded-2xl border border-white/10"
          :participant="p"
          :audio-output-device-id="layout.audioOutputDeviceId"
          :speaking="layout.speakingIds.has(p.id)"
          :pinned="layout.pinnedId === p.id"
          :title="layout.pinnedId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          @click="emit('toggle-pin', p.id)"
        />
      </div>
    </div>

    <!-- Center stage + right dock -->
    <div class="flex flex-1 min-h-0 gap-3">
      <div class="relative flex-1 min-h-0">
        <MeetingTile
          :key="`${layout.featured.id}-${layout.featured.streamEpoch}`"
          tile-role="featured"
          variant="featured"
          class="w-full h-full rounded-3xl"
          :participant="layout.featured"
          :audio-output-device-id="layout.audioOutputDeviceId"
          :speaking="layout.speakingIds.has(layout.featured.id)"
          :pinned="layout.pinnedId === layout.featured.id"
          :title="layout.pinnedId === layout.featured.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          @click="emit('toggle-pin', layout.featured.id)"
        />
      </div>

      <div
        v-if="layout.rightDockPeers.length"
        class="w-64 shrink-0 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2"
      >
        <MeetingTile
          v-for="p in layout.rightDockPeers"
          :key="`${p.id}-${p.streamEpoch}`"
          tile-role="dock"
          variant="dock"
          class="w-full aspect-video rounded-2xl border border-white/10"
          :participant="p"
          :audio-output-device-id="layout.audioOutputDeviceId"
          :speaking="layout.speakingIds.has(p.id)"
          :pinned="layout.pinnedId === p.id"
          :title="layout.pinnedId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          @click="emit('toggle-pin', p.id)"
        />
      </div>
    </div>
  </section>
</template>
