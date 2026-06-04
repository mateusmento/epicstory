<script lang="ts" setup>
import { getEventEndTime, getEventHeightPx, getEventLayoutMode, getEventTopOffset } from "@/domain/schedule";
import type { ICalendarEvent } from "@epicstory/contracts";
import { format } from "date-fns";

const props = defineProps<{
  event: ICalendarEvent;
  minHeightPx: number;
  compact?: boolean;
  isResizing: boolean;
  resizingEventId: string | null;
  resizeType: "start" | "end" | null;
}>();

const emit = defineEmits<{
  edit: [event: ICalendarEvent];
  resizeStart: [event: ICalendarEvent, type: "start" | "end", mouseEvent: MouseEvent];
}>();

const layoutMode = () => getEventLayoutMode(props.event);
</script>

<template>
  <div
    class="absolute left-0 right-0 rounded bg-blue-500 text-white cursor-pointer hover:bg-blue-600 z-20 overflow-hidden flex flex-col leading-tight"
    :class="compact ? 'p-1 m-1 text-xs' : 'p-2 m-1'"
    :style="{
      top: `${getEventTopOffset(event)}px`,
      height: `${getEventHeightPx(event, minHeightPx)}px`,
    }"
    @click.stop="emit('edit', event)"
  >
    <div
      class="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 rounded-t"
      :class="{ 'bg-blue-400': isResizing && resizingEventId === event.id && resizeType === 'start' }"
      @mousedown.stop="emit('resizeStart', event, 'start', $event)"
    />
    <div class="min-h-0 flex flex-col" :class="compact ? 'gap-0.5' : 'gap-1'">
      <div class="flex items-center gap-1 min-w-0">
        <span v-if="layoutMode() !== 'normal'" class="shrink-0 text-[10px] opacity-90">
          {{ format(new Date(event.startsAt), "HH:mm") }}
        </span>
        <div class="font-medium truncate min-w-0">{{ event.title }}</div>
      </div>
      <div
        v-if="layoutMode() === 'normal' && event.description"
        class="opacity-90 truncate"
        :class="compact ? 'text-[10px]' : 'text-[11px] line-clamp-2'"
      >
        {{ event.description }}
      </div>
      <div v-if="layoutMode() === 'normal'" class="text-[10px] opacity-75">
        {{ format(new Date(event.startsAt), "HH:mm") }} - {{ format(getEventEndTime(event), "HH:mm") }}
      </div>
    </div>
    <div
      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 rounded-b"
      :class="{ 'bg-blue-400': isResizing && resizingEventId === event.id && resizeType === 'end' }"
      @mousedown.stop="emit('resizeStart', event, 'end', $event)"
    />
  </div>
</template>
