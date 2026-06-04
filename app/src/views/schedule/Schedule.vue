<script lang="ts" setup>
import {
  CalendarItemDialog,
  ScheduleDayView,
  ScheduleMonthView,
  ScheduleToolbar,
  ScheduleWeekView,
} from "@/components/schedule";
import { useSchedulePage } from "@/domain/schedule";
import { useWorkspace } from "@/domain/workspace";
import type { ICalendarEvent } from "@epicstory/contracts";
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { workspace } = useWorkspace();

const {
  currentView,
  currentDate,
  headerLabel,
  goToToday,
  goToPrevious,
  goToNext,
  monthProps,
  weekProps,
  dayProps,
  resizingProps,
  resize,
  openCreateDialog,
  openEditCalendarDialog,
  handleTimeSlotClick,
  removeCalendarItem,
} = useSchedulePage();

const weekViewProps = computed(() => ({
  ...weekProps.value,
  ...resizingProps.value,
}));

const dayViewProps = computed(() => ({
  ...dayProps.value,
  ...resizingProps.value,
}));

function goToMeetingLobby(event: ICalendarEvent) {
  if (!workspace.value?.id) return;
  router.push({
    name: "meeting-lobby",
    params: { workspaceId: workspace.value.id, calendarEventId: event.id },
    query: { occurrenceAt: new Date(event.startsAt).toISOString() },
  });
}
</script>

<template>
  <div class="flex:col h-full w-full">
    <ScheduleToolbar
      :header-label="headerLabel"
      v-model:view="currentView"
      @today="goToToday"
      @prev="goToPrevious"
      @next="goToNext"
      @create="openCreateDialog(currentDate)"
    />

    <div class="flex-1 overflow-auto">
      <ScheduleMonthView
        v-if="currentView === 'month'"
        v-bind="monthProps"
        @day-click="openCreateDialog"
        @edit="openEditCalendarDialog"
        @remove="removeCalendarItem"
        @open-lobby="goToMeetingLobby"
      />
      <ScheduleWeekView
        v-else-if="currentView === 'week'"
        v-bind="weekViewProps"
        @slot-click="(day, hour, e) => handleTimeSlotClick(day, hour, e)"
        @edit="openEditCalendarDialog"
        @remove="removeCalendarItem"
        @open-lobby="goToMeetingLobby"
        @resize-start="resize.handleResizeStart"
      />
      <ScheduleDayView
        v-else
        v-bind="dayViewProps"
        @slot-click="(day, hour, e) => handleTimeSlotClick(day, hour, e)"
        @edit="openEditCalendarDialog"
        @remove="removeCalendarItem"
        @open-lobby="goToMeetingLobby"
        @resize-start="resize.handleResizeStart"
      />
    </div>

    <CalendarItemDialog />
  </div>
</template>
