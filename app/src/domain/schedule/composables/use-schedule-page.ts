import { computed, onMounted, provide } from "vue";
import { SCHEDULE_DIALOG_KEY } from "../schedule-context";
import { SCHEDULE_HOURS } from "../constants";
import {
  computeActiveMonthAnchor,
  computeMonthGridDays,
  computeMonthWeekdayLabels,
  computeWeekDays,
  normalizeScheduleDay,
} from "../schedule-date";
import { useCalendarEventResize } from "./use-calendar-event-resize";
import { useCalendarItemDialog } from "./use-calendar-item-dialog";
import { useScheduleDeepLink } from "./use-schedule-deep-link";
import { useScheduleEvents } from "./use-schedule-events";
import { useScheduleNavigation } from "./use-schedule-navigation";

export function useSchedulePage() {
  const navigation = useScheduleNavigation();
  const eventsApi = useScheduleEvents(navigation);
  const resize = useCalendarEventResize({
    events: eventsApi.events,
    refresh: eventsApi.refresh,
  });
  const dialog = useCalendarItemDialog(eventsApi);
  provide(SCHEDULE_DIALOG_KEY, dialog);
  useScheduleDeepLink(dialog);

  onMounted(() => {
    dialog.ensureDialogDataLoaded();
  });

  const resizingEventId = computed(() => resize.resizingEvent.value?.id ?? null);

  const resizingProps = computed(() => ({
    isResizing: resize.isResizing.value,
    resizingEventId: resizingEventId.value,
    resizeType: resize.resizeType.value,
  }));

  const monthProps = computed(() => ({
    gridDays: computeMonthGridDays(eventsApi.dateRange.value),
    weekdayLabels: computeMonthWeekdayLabels(),
    activeMonthAnchor: computeActiveMonthAnchor(navigation.currentDate.value),
    getPreviewEvents: eventsApi.getPreviewEventsForDayCell,
    getOverflowCount: eventsApi.getOverflowCountForDayCell,
  }));

  const weekProps = computed(() => ({
    weekDays: computeWeekDays(navigation.currentDate.value),
    hours: SCHEDULE_HOURS,
    getEventsAtHour: eventsApi.getEventsStartingAtHour,
  }));

  const dayProps = computed(() => ({
    day: normalizeScheduleDay(navigation.currentDate.value),
    hours: SCHEDULE_HOURS,
    getEventsAtHour: eventsApi.getEventsStartingAtHour,
  }));

  return {
    ...navigation,
    isLoading: eventsApi.isLoading,
    monthProps,
    weekProps,
    dayProps,
    resizingProps,
    resize,
    dialog,
    openCreateDialog: dialog.openCreateDialog,
    openEditCalendarDialog: dialog.openEditCalendarDialog,
    handleTimeSlotClick: dialog.handleTimeSlotClick,
    removeCalendarItem: dialog.removeCalendarItem,
  };
}
