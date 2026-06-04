import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { CalendarEventApi } from "@epicstory/api-client";
import type { ICalendarEvent } from "@epicstory/contracts";
import { format, getHours, isSameDay } from "date-fns";
import { computed, onMounted, ref, watch, type Ref } from "vue";
import { SCHEDULE_MAX_EVENTS_PER_DAY_CELL, type ScheduleViewType } from "../constants";
import { computeDateRange } from "../schedule-date";
import type { ScheduleNavigationRefs } from "./use-schedule-navigation";

export function useScheduleEvents(navigation: ScheduleNavigationRefs) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const calendarEventApi = useDependency(CalendarEventApi);

  const events = ref<ICalendarEvent[]>([]);
  const isLoading = ref(false);

  const dateRange = computed(() =>
    computeDateRange(navigation.currentView.value, navigation.currentDate.value),
  );

  const eventsByDayKey = computed(() => {
    const map = new Map<string, ICalendarEvent[]>();
    for (const ev of events.value) {
      const key = format(new Date(ev.startsAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      map.set(key, list);
    }
    return map;
  });

  function getEventsForDayCell(date: Date): ICalendarEvent[] {
    const key = format(date, "yyyy-MM-dd");
    return eventsByDayKey.value.get(key) ?? [];
  }

  function getPreviewEventsForDayCell(date: Date): ICalendarEvent[] {
    return getEventsForDayCell(date).slice(0, SCHEDULE_MAX_EVENTS_PER_DAY_CELL);
  }

  function getOverflowCountForDayCell(date: Date): number {
    return Math.max(0, getEventsForDayCell(date).length - SCHEDULE_MAX_EVENTS_PER_DAY_CELL);
  }

  function getEventsStartingAtHour(date: Date, hour: number): ICalendarEvent[] {
    return events.value.filter((event) => {
      const eventDate = new Date(event.startsAt);
      return isSameDay(eventDate, date) && getHours(eventDate) === hour;
    });
  }

  async function fetchEvents() {
    if (!user.value) return;
    isLoading.value = true;
    try {
      if (!workspace.value?.id) {
        events.value = [];
        return;
      }
      events.value = await calendarEventApi.findCalendarEvents({
        workspaceId: workspace.value.id,
        startDate: dateRange.value.start,
        endDate: dateRange.value.end,
      });
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      isLoading.value = false;
    }
  }

  watch(
    [navigation.currentView, navigation.currentDate],
    async () => {
      if (user.value) await fetchEvents();
    },
    { immediate: false },
  );

  onMounted(async () => {
    if (user.value) await fetchEvents();
  });

  return {
    events,
    isLoading,
    dateRange,
    eventsByDayKey,
    getEventsForDayCell,
    getPreviewEventsForDayCell,
    getOverflowCountForDayCell,
    getEventsStartingAtHour,
    refresh: fetchEvents,
  };
}

export type ScheduleEvents = ReturnType<typeof useScheduleEvents>;
