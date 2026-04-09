<script setup lang="ts">
import { cn } from "@/design-system/utils";
import type { MeetingParticipant } from "@/domain/channels/composables/meeting-layout";
import MeetingTile from "./MeetingTile.vue";

const props = defineProps<{
  featured: MeetingParticipant;
  topDockPeers: MeetingParticipant[];
  rightDockPeers: MeetingParticipant[];
  isSpeaking: (id: string) => boolean;
  pinnedId: string | null;
  onTogglePin: (id: string) => void;
  class?: string;
}>();
</script>

<template>
  <section :class="cn('flex flex-col flex-1 min-h-0 gap-3', props.class)">
    <!-- Top dock -->
    <div v-if="topDockPeers.length" class="overflow-x-auto px-2">
      <div class="flex items-center justify-center gap-2 w-max min-w-full">
        <MeetingTile
          v-for="p in topDockPeers"
          :key="p.id"
          variant="dock"
          class="shrink-0 w-56 aspect-video rounded-2xl border border-white/10"
          :participant="p"
          :speaking="isSpeaking(p.id)"
          :pinned="pinnedId === p.id"
          :title="pinnedId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          @click="onTogglePin(p.id)"
        />
      </div>
    </div>

    <!-- Center stage + right dock -->
    <div class="flex flex-1 min-h-0 gap-3">
      <div class="relative flex-1 min-h-0">
        <MeetingTile
          variant="featured"
          class="w-full h-full rounded-3xl"
          :participant="featured"
          :speaking="isSpeaking(featured.id)"
          :pinned="pinnedId === featured.id"
          :title="pinnedId === featured.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          @click="onTogglePin(featured.id)"
        />
      </div>

      <div
        v-if="rightDockPeers.length"
        class="w-64 shrink-0 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2"
      >
        <MeetingTile
          v-for="p in rightDockPeers"
          :key="p.id"
          variant="dock"
          class="w-full aspect-video rounded-2xl border border-white/10"
          :participant="p"
          :speaking="isSpeaking(p.id)"
          :pinned="pinnedId === p.id"
          :title="pinnedId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          @click="onTogglePin(p.id)"
        />
      </div>
    </div>
  </section>
</template>
