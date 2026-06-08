<script lang="ts" setup>
import CalendarEventContextMenu from "./CalendarEventContextMenu.vue";
import type { ICalendarEvent } from "@epicstory/contracts";
import { format, isSameDay, isSameMonth } from "date-fns";

const props = defineProps<{
  gridDays: Date[];
  weekdayLabels: string[];
  activeMonthAnchor: Date;
  getPreviewEvents: (date: Date) => ICalendarEvent[];
  getOverflowCount: (date: Date) => number;
}>();

const emit = defineEmits<{
  dayClick: [date: Date];
  edit: [event: ICalendarEvent];
  remove: [event: ICalendarEvent];
  openLobby: [event: ICalendarEvent];
}>();
</script>

<template>
  <div class="h-full">
    <div class="bg-card h-full min-h-[560px] flex flex-col overflow-hidden">
      <div class="grid grid-cols-7 border-b bg-card sticky top-0 z-10">
        <div
          v-for="label in props.weekdayLabels"
          :key="label"
          class="px-3 py-2 text-xs font-medium text-secondary-foreground border-r last:border-r-0"
        >
          {{ label }}
        </div>
      </div>

      <div class="grid grid-cols-7 grid-rows-6 flex-1 min-h-0">
        <div
          v-for="day in props.gridDays"
          :key="day.toISOString()"
          class="border-r border-b last:border-r-0 min-h-0"
          :class="{ 'bg-muted/50 text-muted-foreground': !isSameMonth(day, props.activeMonthAnchor) }"
          @click="emit('dayClick', day)"
        >
          <div class="h-full w-full p-2 flex flex-col min-h-0 hover:bg-muted/40 transition-colors">
            <div class="flex items-start justify-between gap-2">
              <div
                class="text-xs font-medium w-7 h-7 grid place-items-center rounded-full select-none"
                :class="{ 'bg-blue-600 text-white': isSameDay(day, new Date()) }"
              >
                {{ format(day, "d") }}
              </div>
            </div>

            <div class="mt-1 flex-1 min-h-0 overflow-hidden space-y-1">
              <CalendarEventContextMenu
                v-for="event in props.getPreviewEvents(day)"
                :key="event.occurrenceId"
                :event="event"
                @edit="emit('edit', $event)"
                @remove="emit('remove', $event)"
                @open-lobby="emit('openLobby', $event)"
              >
                <div
                  class="px-2 py-1 rounded bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                  title="Open event"
                  @click.stop="emit('edit', event)"
                >
                  <div class="text-[11px] font-medium text-blue-900 truncate">
                    {{ format(new Date(event.startsAt), "HH:mm") }} {{ event.title }}
                  </div>
                </div>
              </CalendarEventContextMenu>

              <div
                v-if="props.getOverflowCount(day) > 0"
                class="text-[11px] text-secondary-foreground select-none"
              >
                +{{ props.getOverflowCount(day) }} more
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
