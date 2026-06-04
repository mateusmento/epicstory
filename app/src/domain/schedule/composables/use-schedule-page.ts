import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import type { ICalendarEvent } from "@epicstory/contracts";
import { getHours, isSameDay } from "date-fns";
import { computed, onMounted, provide, ref } from "vue";
import { SCHEDULE_DIALOG_KEY } from "../schedule-context";
import { SCHEDULE_DRAFT_EVENT_ID, SCHEDULE_HOURS } from "../constants";
import {
  computeActiveMonthAnchor,
  computeMonthGridDays,
  computeMonthWeekdayLabels,
  computeWeekDays,
  normalizeScheduleDay,
} from "../schedule-date";
import { useCalendarEventCreateDrag } from "./use-calendar-event-create-drag";
import { useCalendarEventPan } from "./use-calendar-event-pan";
import { useCalendarEventResize } from "./use-calendar-event-resize";
import { useCalendarItemDialog } from "./use-calendar-item-dialog";
import { useScheduleDeepLink } from "./use-schedule-deep-link";
import { useScheduleEvents } from "./use-schedule-events";
import { useScheduleNavigation } from "./use-schedule-navigation";

function appendDraftToHourEvents(
  events: ICalendarEvent[],
  draft: ICalendarEvent | null,
  date: Date,
  hour: number,
): ICalendarEvent[] {
  if (!draft) return events;
  const draftStart = new Date(draft.startsAt);
  if (!isSameDay(draftStart, date) || getHours(draftStart) !== hour) {
    return events;
  }
  return [...events, draft];
}

export function useSchedulePage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const navigation = useScheduleNavigation();
  const eventsApi = useScheduleEvents(navigation);
  const draftEvent = ref<ICalendarEvent | null>(null);
  const dialog = useCalendarItemDialog(eventsApi, {
    clearDraft: () => {
      draftEvent.value = null;
    },
  });
  const pan = useCalendarEventPan({
    events: eventsApi.events,
    refresh: eventsApi.refresh,
    currentView: navigation.currentView,
    onTapEdit: dialog.openEditCalendarDialog,
  });
  const resize = useCalendarEventResize({
    events: eventsApi.events,
    refresh: eventsApi.refresh,
  });
  const createDrag = useCalendarEventCreateDrag({
    draftEvent,
    workspaceId: computed(() => workspace.value?.id),
    userId: computed(() => user.value?.id),
    openCreateDialog: dialog.openCreateDialog,
  });
  provide(SCHEDULE_DIALOG_KEY, dialog);
  useScheduleDeepLink(dialog);

  onMounted(() => {
    dialog.ensureDialogDataLoaded();
  });

  const resizingEventId = computed(() => resize.resizingEvent.value?.id ?? null);
  const panningEventId = computed(() => pan.panningEvent.value?.id ?? null);

  const resizingProps = computed(() => ({
    isResizing: resize.isResizing.value,
    resizingEventId: resizingEventId.value,
    resizeType: resize.resizeType.value,
  }));

  const panningProps = computed(() => ({
    isPanning: pan.isPanning.value,
    panningEventId: panningEventId.value,
  }));

  const monthProps = computed(() => ({
    gridDays: computeMonthGridDays(eventsApi.dateRange.value),
    weekdayLabels: computeMonthWeekdayLabels(),
    activeMonthAnchor: computeActiveMonthAnchor(navigation.currentDate.value),
    getPreviewEvents: eventsApi.getPreviewEventsForDayCell,
    getOverflowCount: eventsApi.getOverflowCountForDayCell,
  }));

  const timedGridProps = computed(() => ({
    isCreating: createDrag.isCreating.value,
    draftEventId: SCHEDULE_DRAFT_EVENT_ID,
    ...panningProps.value,
  }));

  const weekProps = computed(() => ({
    weekDays: computeWeekDays(navigation.currentDate.value),
    hours: SCHEDULE_HOURS,
    getEventsAtHour: (date: Date, hour: number) =>
      appendDraftToHourEvents(eventsApi.getEventsStartingAtHour(date, hour), draftEvent.value, date, hour),
  }));

  const dayProps = computed(() => ({
    day: normalizeScheduleDay(navigation.currentDate.value),
    hours: SCHEDULE_HOURS,
    getEventsAtHour: (date: Date, hour: number) =>
      appendDraftToHourEvents(eventsApi.getEventsStartingAtHour(date, hour), draftEvent.value, date, hour),
  }));

  return {
    ...navigation,
    isLoading: eventsApi.isLoading,
    monthProps,
    weekProps,
    dayProps,
    resizingProps,
    timedGridProps,
    resize,
    pan,
    createDrag,
    dialog,
    openCreateDialog: dialog.openCreateDialog,
    openEditCalendarDialog: dialog.openEditCalendarDialog,
    handleSlotMouseDown: (date: Date, hour: number, mouseEvent: MouseEvent) => {
      if (pan.isPanning.value || resize.isResizing.value || createDrag.isCreating.value) return;
      createDrag.handleSlotMouseDown(date, hour, mouseEvent);
    },
    removeCalendarItem: dialog.removeCalendarItem,
  };
}
