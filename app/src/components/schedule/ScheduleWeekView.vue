<script lang="ts" setup>
import CalendarEventContextMenu from "./CalendarEventContextMenu.vue";
import CalendarTimedEventBlock from "./CalendarTimedEventBlock.vue";
import type { ICalendarEvent } from "@epicstory/contracts";
import { format, isSameDay } from "date-fns";

const props = defineProps<{
  weekDays: Date[];
  hours: number[];
  getEventsAtHour: (date: Date, hour: number) => ICalendarEvent[];
  isResizing: boolean;
  resizingEventId: string | null;
  resizeType: "start" | "end" | null;
}>();

const emit = defineEmits<{
  slotClick: [date: Date, hour: number, event: MouseEvent];
  edit: [event: ICalendarEvent];
  remove: [event: ICalendarEvent];
  openLobby: [event: ICalendarEvent];
  resizeStart: [event: ICalendarEvent, type: "start" | "end", mouseEvent: MouseEvent];
}>();
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="flex border-b bg-white sticky top-0 z-10">
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
      <div class="w-16 border-r bg-white">
        <div
          v-for="hour in props.hours"
          :key="hour"
          class="h-16 border-b p-1 text-xs text-secondary-foreground"
        >
          {{ hour.toString().padStart(2, "0") }}:00
        </div>
      </div>
      <div v-for="day in props.weekDays" :key="day.toISOString()" class="flex-1 border-r">
        <div
          v-for="hour in props.hours"
          :key="hour"
          class="h-16 border-b cursor-pointer hover:bg-gray-50 transition-colors relative"
          @click="emit('slotClick', day, hour, $event)"
        >
          <CalendarEventContextMenu
            v-for="event in props.getEventsAtHour(day, hour)"
            :key="event.occurrenceId"
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
              @edit="emit('edit', $event)"
              @resize-start="(ev, type, e) => emit('resizeStart', ev, type, e)"
            />
          </CalendarEventContextMenu>
        </div>
      </div>
    </div>
  </div>
</template>
