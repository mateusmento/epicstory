<script lang="ts" setup>
import type { ICalendarEvent } from "@epicstory/contracts";
import { format } from "date-fns";
import CalendarEventContextMenu from "./CalendarEventContextMenu.vue";
import CalendarTimedEventBlock from "./CalendarTimedEventBlock.vue";
import Separator from "@/design-system/ui/separator/Separator.vue";
import { cn } from "@/design-system/utils.js";
import { SCHEDULE_HOUR_SLOT_HEIGHT_CLASS } from "@/lib/schedule";

const props = defineProps<{
  day: Date;
  hours: number[];
  getEventsAtHour: (date: Date, hour: number) => ICalendarEvent[];
  isResizing: boolean;
  resizingEventId: string | null;
  resizeType: "start" | "end" | null;
  isCreating: boolean;
  draftEventId: string;
  isPanning: boolean;
  panningEventId: string | null;
}>();

const emit = defineEmits<{
  slotMouseDown: [date: Date, hour: number, event: MouseEvent];
  edit: [event: ICalendarEvent];
  remove: [event: ICalendarEvent];
  openLobby: [event: ICalendarEvent];
  resizeStart: [event: ICalendarEvent, type: "start" | "end", mouseEvent: MouseEvent];
  panStart: [event: ICalendarEvent, mouseEvent: MouseEvent];
}>();
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="flex border-b bg-card sticky top-0 z-10 p-4">
      <div class="ml-16 text-2xl font-semibold">{{ format(props.day, "EEEE, MMMM d, yyyy") }}</div>
    </div>
    <div class="flex">
      <div class="w-16 border-r bg-card flex flex-col">
        <template v-for="hour in props.hours" :key="hour">
          <div :class="cn(SCHEDULE_HOUR_SLOT_HEIGHT_CLASS, 'p-1 text-xs text-secondary-foreground')">
            {{ hour.toString().padStart(2, "0") }}:00
          </div>
          <Separator />
        </template>
      </div>
      <div class="flex-1" :data-schedule-day="props.day.toISOString()">
        <template v-for="hour in props.hours" :key="hour">
          <div
            :class="
              cn(
                SCHEDULE_HOUR_SLOT_HEIGHT_CLASS,
                'cursor-pointer hover:bg-muted/50 transition-colors relative',
                props.isCreating && 'select-none',
                props.isPanning && 'select-none',
              )
            "
            @mousedown="emit('slotMouseDown', props.day, hour, $event)"
          >
            <template v-for="event in props.getEventsAtHour(props.day, hour)" :key="event.occurrenceId">
              <CalendarTimedEventBlock
                v-if="event.id === props.draftEventId"
                :event="event"
                draft
                :min-height-px="24"
                :is-resizing="false"
                :resizing-event-id="null"
                :resize-type="null"
                :is-panning="false"
                :panning-event-id="null"
              />
              <CalendarEventContextMenu
                v-else
                :event="event"
                @edit="emit('edit', $event)"
                @remove="emit('remove', $event)"
                @open-lobby="emit('openLobby', $event)"
              >
                <CalendarTimedEventBlock
                  :event="event"
                  :min-height-px="24"
                  :is-resizing="props.isResizing"
                  :resizing-event-id="props.resizingEventId"
                  :resize-type="props.resizeType"
                  :is-panning="props.isPanning"
                  :panning-event-id="props.panningEventId"
                  @pan-start="(ev, e) => emit('panStart', ev, e)"
                  @resize-start="(ev, type, e) => emit('resizeStart', ev, type, e)"
                />
              </CalendarEventContextMenu>
            </template>
          </div>
          <Separator />
        </template>
      </div>
    </div>
  </div>
</template>
