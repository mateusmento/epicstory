import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { CalendarEventApi } from "@epicstory/api-client";
import type { ICalendarEvent } from "@epicstory/contracts";
import { startOfDay } from "date-fns";
import { onMounted, onUnmounted, ref, type Ref } from "vue";
import { getEventEndTime, SCHEDULE_DRAFT_EVENT_ID, type ScheduleViewType } from "@/lib/schedule";
import {
  didSchedulePointerMove,
  getScheduleDayFromPointer,
  minutesDeltaFromPointerDelta,
  shiftTimedEventRange,
} from "../schedule-slot-time";

const PAN_CLICK_THRESHOLD_PX = 3;

export function useCalendarEventPan(options: {
  events: Ref<ICalendarEvent[]>;
  refresh: () => Promise<void>;
  currentView: Ref<ScheduleViewType>;
  onTapEdit: (event: ICalendarEvent) => void;
}) {
  const { user } = useAuth();
  const calendarEventApi = useDependency(CalendarEventApi);

  const isPanning = ref(false);
  const panningEvent = ref<ICalendarEvent | null>(null);
  const panStartX = ref(0);
  const panStartY = ref(0);
  const panOriginalStart = ref<Date | null>(null);
  const panOriginalEnd = ref<Date | null>(null);
  const panOriginalDay = ref<Date | null>(null);
  const panTargetDay = ref<Date | null>(null);

  function canPanEvent(event: ICalendarEvent): boolean {
    if (event.id === SCHEDULE_DRAFT_EVENT_ID) return false;
    if (event.type === "meeting") return false;
    if (event.occurrenceId !== event.id) return false;
    return true;
  }

  function handlePanStart(event: ICalendarEvent, mouseEvent: MouseEvent) {
    if (!canPanEvent(event)) return;
    if (mouseEvent.button !== 0) return;

    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    const originalStart = new Date(event.startsAt);
    const originalEnd = getEventEndTime(event);

    isPanning.value = true;
    panningEvent.value = event;
    panStartX.value = mouseEvent.clientX;
    panStartY.value = mouseEvent.clientY;
    panOriginalStart.value = originalStart;
    panOriginalEnd.value = originalEnd;
    panOriginalDay.value = startOfDay(originalStart);
    panTargetDay.value =
      getScheduleDayFromPointer(mouseEvent.clientX, mouseEvent.clientY) ?? panOriginalDay.value;
  }

  function handlePanMove(mouseEvent: MouseEvent) {
    if (
      !isPanning.value ||
      !panningEvent.value ||
      !panOriginalStart.value ||
      !panOriginalEnd.value ||
      !panOriginalDay.value
    ) {
      return;
    }

    const dayUnderPointer = getScheduleDayFromPointer(mouseEvent.clientX, mouseEvent.clientY);
    if (dayUnderPointer) {
      panTargetDay.value = dayUnderPointer;
    }

    const minutesDelta = minutesDeltaFromPointerDelta(mouseEvent.clientY - panStartY.value);
    const targetDay =
      options.currentView.value === "week" ? (panTargetDay.value ?? panOriginalDay.value) : null;
    const { start, end } = shiftTimedEventRange(
      panOriginalStart.value,
      panOriginalEnd.value,
      minutesDelta,
      targetDay,
    );

    const eventIndex = options.events.value.findIndex((e) => e.id === panningEvent.value!.id);
    if (eventIndex === -1) return;

    const updatedEvent = { ...options.events.value[eventIndex] };
    updatedEvent.startsAt = start.toISOString();
    updatedEvent.endsAt = end.toISOString();
    options.events.value[eventIndex] = updatedEvent;
  }

  async function handlePanEnd(mouseEvent: MouseEvent) {
    if (!isPanning.value || !panningEvent.value || !panOriginalStart.value || !panOriginalDay.value) {
      return;
    }

    const event = panningEvent.value;
    const originalDay = panOriginalDay.value;
    const moved = didSchedulePointerMove(
      panStartX.value,
      panStartY.value,
      mouseEvent.clientX,
      mouseEvent.clientY,
      originalDay,
      panTargetDay.value,
      PAN_CLICK_THRESHOLD_PX,
    );

    isPanning.value = false;
    panningEvent.value = null;
    panOriginalStart.value = null;
    panOriginalEnd.value = null;
    panOriginalDay.value = null;
    panTargetDay.value = null;

    if (!moved) {
      options.onTapEdit(event);
      return;
    }

    const latest = options.events.value.find((e) => e.id === event.id);
    if (!latest || latest.type === "meeting" || !user.value) {
      await options.refresh();
      return;
    }

    try {
      await calendarEventApi.updateCalendarEvent({
        id: latest.id,
        startsAt: new Date(latest.startsAt),
        endsAt: new Date(latest.endsAt),
      });
      await options.refresh();
    } catch (error) {
      console.error("Failed to move event:", error);
      await options.refresh();
    }
  }

  onMounted(() => {
    document.addEventListener("mousemove", handlePanMove);
    document.addEventListener("mouseup", handlePanEnd);
  });

  onUnmounted(() => {
    document.removeEventListener("mousemove", handlePanMove);
    document.removeEventListener("mouseup", handlePanEnd);
  });

  return {
    isPanning,
    panningEvent,
    handlePanStart,
  };
}

export type CalendarEventPan = ReturnType<typeof useCalendarEventPan>;
