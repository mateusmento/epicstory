import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { CalendarEventApi } from "@epicstory/api-client";
import type { ICalendarEvent } from "@epicstory/contracts";
import { onMounted, onUnmounted, ref, type Ref } from "vue";
import { getEventEndTime } from "../calendar-event-layout";
import { SCHEDULE_HOUR_SLOT_PX } from "../constants";

export function useCalendarEventResize(options: {
  events: Ref<ICalendarEvent[]>;
  refresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const calendarEventApi = useDependency(CalendarEventApi);

  const isResizing = ref(false);
  const resizingEvent = ref<ICalendarEvent | null>(null);
  const resizeType = ref<"start" | "end" | null>(null);
  const resizeStartY = ref(0);
  const resizeStartTime = ref(0);

  function handleResizeStart(event: ICalendarEvent, type: "start" | "end", mouseEvent: MouseEvent) {
    if (event.type === "meeting") return;
    if (event.occurrenceId !== event.id) return;
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    isResizing.value = true;
    resizingEvent.value = event;
    resizeType.value = type;
    resizeStartY.value = mouseEvent.clientY;
    resizeStartTime.value =
      type === "start" ? new Date(event.startsAt).getTime() : getEventEndTime(event).getTime();
  }

  function handleResizeMove(mouseEvent: MouseEvent) {
    if (!isResizing.value || !resizingEvent.value || !resizeType.value) return;

    const deltaY = mouseEvent.clientY - resizeStartY.value;
    const minutesDelta = Math.round((deltaY / SCHEDULE_HOUR_SLOT_PX) * 60);
    const roundedMinutes = Math.round(minutesDelta / 15) * 15;
    const newTime = new Date(resizeStartTime.value + roundedMinutes * 60 * 1000);

    const eventIndex = options.events.value.findIndex((e) => e.id === resizingEvent.value!.id);
    if (eventIndex !== -1) {
      const updatedEvent = { ...options.events.value[eventIndex] };
      if (resizeType.value === "start") {
        updatedEvent.startsAt = newTime.toISOString();
      } else {
        updatedEvent.endsAt = newTime.toISOString();
      }
      options.events.value[eventIndex] = updatedEvent;
    }
  }

  async function handleResizeEnd() {
    if (!isResizing.value || !resizingEvent.value || !resizeType.value || !user.value) {
      return;
    }

    const event = resizingEvent.value;
    if (event.type === "meeting") {
      isResizing.value = false;
      resizingEvent.value = null;
      resizeType.value = null;
      return;
    }

    try {
      if (resizeType.value === "start") {
        await calendarEventApi.updateCalendarEvent({
          id: event.id,
          startsAt: new Date(event.startsAt),
        });
      } else {
        await calendarEventApi.updateCalendarEvent({
          id: event.id,
          endsAt: new Date(event.endsAt),
        });
      }
      await options.refresh();
    } catch (error) {
      console.error("Failed to update event:", error);
      await options.refresh();
    } finally {
      isResizing.value = false;
      resizingEvent.value = null;
      resizeType.value = null;
    }
  }

  onMounted(() => {
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  });

  onUnmounted(() => {
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  });

  return {
    isResizing,
    resizingEvent,
    resizeType,
    handleResizeStart,
  };
}

export type CalendarEventResize = ReturnType<typeof useCalendarEventResize>;
