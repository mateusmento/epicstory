import type { ICalendarEvent } from "@epicstory/contracts";
import { onMounted, onUnmounted, ref, type Ref } from "vue";
import { SCHEDULE_DRAFT_EVENT_ID } from "../constants";
import {
  endTimeFromDragDelta,
  formatScheduleTimeRange,
  normalizeCreateRange,
  normalizeDragPreviewRange,
  startTimeFromSlotMouseDown,
} from "../schedule-slot-time";

const CREATE_DRAG_CLICK_THRESHOLD_PX = 3;

function buildDraftEvent(
  workspaceId: number,
  createdById: number,
  startsAt: Date,
  endsAt: Date,
): ICalendarEvent {
  return {
    id: SCHEDULE_DRAFT_EVENT_ID,
    occurrenceId: SCHEDULE_DRAFT_EVENT_ID,
    workspaceId,
    createdById,
    type: "event",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    title: "New event",
    description: "",
    isPublic: false,
    notifyEnabled: false,
    notifyMinutesBefore: 0,
    recurrence: { frequency: "once" },
    payload: { type: "calendar_event" },
  };
}

export function useCalendarEventCreateDrag(options: {
  draftEvent: Ref<ICalendarEvent | null>;
  workspaceId: Ref<number | undefined>;
  userId: Ref<number | undefined>;
  openCreateDialog: (
    date?: Date,
    startTime?: string,
    endTime?: string,
    options?: { keepDraft?: boolean },
  ) => void;
}) {
  const isCreating = ref(false);
  const dragStartY = ref(0);
  const dragStartTime = ref<Date | null>(null);
  const dragDay = ref<Date | null>(null);

  function setDraft(start: Date, end: Date) {
    const workspaceId = options.workspaceId.value;
    const userId = options.userId.value;
    if (!workspaceId || !userId) {
      options.draftEvent.value = null;
      return;
    }

    const range = normalizeDragPreviewRange(start, end);
    options.draftEvent.value = buildDraftEvent(workspaceId, userId, range.start, range.end);
  }

  function handleSlotMouseDown(date: Date, hour: number, mouseEvent: MouseEvent) {
    if (isCreating.value) return;
    if (mouseEvent.button !== 0) return;
    if (!options.workspaceId.value || !options.userId.value) return;

    const start = startTimeFromSlotMouseDown(date, hour, mouseEvent);
    isCreating.value = true;
    dragStartY.value = mouseEvent.clientY;
    dragStartTime.value = start;
    dragDay.value = date;
    setDraft(start, start);
    mouseEvent.preventDefault();
  }

  function handleCreateMove(mouseEvent: MouseEvent) {
    if (!isCreating.value || !dragStartTime.value) return;

    const end = endTimeFromDragDelta(dragStartTime.value, mouseEvent.clientY - dragStartY.value);
    setDraft(dragStartTime.value, end);
  }

  function handleCreateEnd(mouseEvent: MouseEvent) {
    if (!isCreating.value || !dragStartTime.value || !dragDay.value) return;

    const day = dragDay.value;
    const deltaY = mouseEvent.clientY - dragStartY.value;
    const clickedWithoutDrag = Math.abs(deltaY) < CREATE_DRAG_CLICK_THRESHOLD_PX;
    const rawEnd = endTimeFromDragDelta(dragStartTime.value, deltaY);
    const { start, end } = normalizeCreateRange(dragStartTime.value, rawEnd, clickedWithoutDrag);
    const { startTime, endTime } = formatScheduleTimeRange(start, end);

    isCreating.value = false;
    dragStartTime.value = null;
    dragDay.value = null;
    setDraft(start, end);

    options.openCreateDialog(day, startTime, endTime, { keepDraft: true });
  }

  function clearDraft() {
    options.draftEvent.value = null;
  }

  function cancelCreate() {
    isCreating.value = false;
    dragStartTime.value = null;
    dragDay.value = null;
    options.draftEvent.value = null;
  }

  onMounted(() => {
    document.addEventListener("mousemove", handleCreateMove);
    document.addEventListener("mouseup", handleCreateEnd);
  });

  onUnmounted(() => {
    document.removeEventListener("mousemove", handleCreateMove);
    document.removeEventListener("mouseup", handleCreateEnd);
  });

  return {
    isCreating,
    handleSlotMouseDown,
    clearDraft,
    cancelCreate,
  };
}

export type CalendarEventCreateDrag = ReturnType<typeof useCalendarEventCreateDrag>;
