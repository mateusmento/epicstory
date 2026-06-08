<script lang="tsx" setup>
import { cn } from "@/design-system/utils";
import {
  getEventEndTime,
  getEventHeightPx,
  getEventLayoutMode,
  getEventTopOffset,
  SCHEDULE_HOUR_SLOT_PX,
} from "@/lib/schedule";
import type { ICalendarEvent } from "@epicstory/contracts";
import { format } from "date-fns";
import { defineComponent, withModifiers, type PropType } from "vue";

const props = defineProps<{
  event: ICalendarEvent;
  minHeightPx: number;
  compact?: boolean;
  draft?: boolean;
  isResizing: boolean;
  resizingEventId: string | null;
  resizeType: "start" | "end" | null;
  isPanning: boolean;
  panningEventId: string | null;
}>();

const emit = defineEmits<{
  panStart: [event: ICalendarEvent, mouseEvent: MouseEvent];
  resizeStart: [event: ICalendarEvent, type: "start" | "end", mouseEvent: MouseEvent];
}>();

const isActivePan = () => props.isPanning && props.panningEventId === props.event.id;

const layoutMode = () => getEventLayoutMode(props.event);

type ResizeEdge = "start" | "end";

const ResizeHandle = defineComponent({
  props: {
    edge: { type: String as PropType<ResizeEdge>, required: true },
    active: { type: Boolean, default: false },
  },
  emits: {
    resizeStart: (mouseEvent: MouseEvent) => mouseEvent instanceof MouseEvent,
  },
  setup(handleProps, { emit: emitHandle }) {
    return () => (
      <div
        class={cn(
          "absolute left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400",
          handleProps.edge === "start" ? "top-0 rounded-t" : "bottom-0 rounded-b",
          handleProps.active && "bg-blue-400",
        )}
        onMousedown={withModifiers((e) => emitHandle("resizeStart", e as MouseEvent), ["stop", "prevent"])}
        onClick={withModifiers(() => {}, ["stop"])}
      />
    );
  },
});

function getEventHeightPxPlusSeparators(event: ICalendarEvent, minPx: number): number {
  const heightPx = getEventHeightPx(event, minPx);
  const slots = Math.floor(heightPx / SCHEDULE_HOUR_SLOT_PX);
  const separators = heightPx % SCHEDULE_HOUR_SLOT_PX === 0 ? slots - 1 : slots;
  return heightPx + separators;
}
</script>

<template>
  <div
    class="absolute left-0 right-0 rounded z-20 overflow-hidden flex flex-col leading-tight"
    :class="[
      draft
        ? 'border-2 border-dashed border-blue-200 bg-blue-500/70 text-white'
        : 'bg-blue-500 text-white hover:bg-blue-600',
      !draft && (isActivePan() ? 'cursor-grabbing z-30' : 'cursor-grab'),
      compact ? 'p-1 text-xs' : 'p-2',
    ]"
    :style="{
      top: `${getEventTopOffset(event)}px`,
      height: `${getEventHeightPxPlusSeparators(event, minHeightPx)}px`,
    }"
    @mousedown.stop="!draft && emit('panStart', event, $event)"
  >
    <ResizeHandle
      v-if="!draft"
      edge="start"
      :active="isResizing && resizingEventId === event.id && resizeType === 'start'"
      @resize-start="(e) => emit('resizeStart', event, 'start', e)"
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
        {{ format(new Date(event.startsAt), "HH:mm") }} -
        {{ format(getEventEndTime(event), "HH:mm") }}
      </div>
    </div>
    <ResizeHandle
      v-if="!draft"
      edge="end"
      :active="isResizing && resizingEventId === event.id && resizeType === 'end'"
      @resize-start="(e) => emit('resizeStart', event, 'end', e)"
    />
  </div>
</template>
