<script lang="ts" setup>
import CalendarEventContextMenu from "./CalendarEventContextMenu.vue";
import CalendarTimedEventBlock from "@/containers/schedule/CalendarTimedEventBlock.vue";
import type { ICalendarEvent } from "@epicstory/contracts";
import { format, isSameDay } from "date-fns";
const props = defineProps<{
  weekDays: Date[];
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
    <div class="flex border-b bg-card sticky top-0 z-10">
      <div class="w-16 border-r" />
      <div
        v-for="day in props.weekDays"
        :key="day.toISOString()"
        class="flex-1 border-r p-2 text-center"
        :class="{ 'bg-blue-50': isSameDay(day, new Date()) }"
      >
        <div class="text-xs text-secondary-foreground">{{ format(day, "EEE") }}</div>
        <div class="text-lg font-semibold">{{ format(day, "d") }}</div>
      </div>
    </div>
    <div class="flex">
      <div class="w-16 border-r bg-card">
        <div
          v-for="hour in props.hours"
          :key="hour"
          class="h-16 border-b p-1 text-xs text-secondary-foreground"
        >
          {{ hour.toString().padStart(2, "0") }}:00
        </div>
      </div>
      <div
        v-for="day in props.weekDays"
        :key="day.toISOString()"
        class="flex-1 border-r"
        :data-schedule-day="day.toISOString()"
      >
        <div
          v-for="hour in props.hours"
          :key="hour"
          class="h-16 border-b cursor-pointer hover:bg-muted/50 transition-colors relative"
          :class="(props.isCreating || props.isPanning) && 'select-none'"
          @mousedown="emit('slotMouseDown', day, hour, $event)"
        >
          <template v-for="event in props.getEventsAtHour(day, hour)" :key="event.occurrenceId">
            <CalendarTimedEventBlock
              v-if="event.id === props.draftEventId"
              :event="event"
              draft
              compact
              :min-height-px="18"
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
                :min-height-px="18"
                compact
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
      </div>
    </div>
  </div>
</template>
