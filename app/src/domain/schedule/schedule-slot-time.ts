import { addMinutes, format, isSameDay, startOfDay } from "date-fns";
import { normalizeScheduleDay, SCHEDULE_HOUR_SLOT_PX } from "@/lib/schedule";

export const SCHEDULE_TIME_QUARTER_MINUTES = 15;
export const SCHEDULE_DAY_COLUMN_ATTR = "data-schedule-day";

export function roundMinutesToQuarter(minutes: number): number {
  return Math.round(minutes / SCHEDULE_TIME_QUARTER_MINUTES) * SCHEDULE_TIME_QUARTER_MINUTES;
}

export function startTimeFromSlotMouseDown(date: Date, hour: number, mouseEvent: MouseEvent): Date {
  const target = mouseEvent.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickY = mouseEvent.clientY - rect.top;
  const clickPercentage = Math.max(0, Math.min(1, clickY / rect.height));
  const minutes = roundMinutesToQuarter(Math.round(clickPercentage * 60));

  const day = startOfDay(normalizeScheduleDay(date));
  day.setHours(hour, minutes, 0, 0);
  return day;
}

export function endTimeFromDragDelta(start: Date, deltaY: number): Date {
  const minutesDelta = minutesDeltaFromPointerDelta(deltaY);
  return addMinutes(start, minutesDelta);
}

export function minutesDeltaFromPointerDelta(deltaY: number): number {
  return roundMinutesToQuarter(Math.round((deltaY / SCHEDULE_HOUR_SLOT_PX) * 60));
}

export function getScheduleDayFromPointer(clientX: number, clientY: number): Date | null {
  const el = document.elementFromPoint(clientX, clientY);
  const column = el?.closest(`[${SCHEDULE_DAY_COLUMN_ATTR}]`);
  if (!column) return null;
  const raw = column.getAttribute(SCHEDULE_DAY_COLUMN_ATTR);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : normalizeScheduleDay(date);
}

export function applyScheduleDayToTime(time: Date, day: Date): Date {
  const result = startOfDay(normalizeScheduleDay(day));
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result;
}

export function shiftTimedEventRange(
  originalStart: Date,
  originalEnd: Date,
  minutesDelta: number,
  targetDay: Date | null,
): { start: Date; end: Date } {
  const durationMs = originalEnd.getTime() - originalStart.getTime();
  let start = addMinutes(originalStart, minutesDelta);
  if (targetDay) {
    start = applyScheduleDayToTime(start, targetDay);
  }
  const end = new Date(start.getTime() + durationMs);
  return clampTimedEventRangeToDay(start, end);
}

function clampTimedEventRangeToDay(start: Date, end: Date): { start: Date; end: Date } {
  const dayStart = startOfDay(start);
  const dayEnd = startOfDay(start);
  dayEnd.setHours(23, 59, 0, 0);
  const durationMs = end.getTime() - start.getTime();

  if (start.getTime() < dayStart.getTime()) {
    start = dayStart;
    end = new Date(start.getTime() + durationMs);
  }
  if (end.getTime() > dayEnd.getTime()) {
    end = dayEnd;
    start = new Date(end.getTime() - durationMs);
    if (start.getTime() < dayStart.getTime()) {
      start = dayStart;
    }
  }
  return { start, end };
}

export function didSchedulePointerMove(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  originalDay: Date,
  targetDay: Date | null,
  thresholdPx: number,
): boolean {
  if (Math.abs(currentX - startX) >= thresholdPx || Math.abs(currentY - startY) >= thresholdPx) {
    return true;
  }
  return targetDay != null && !isSameDay(targetDay, originalDay);
}

export function normalizeDragPreviewRange(start: Date, end: Date): { start: Date; end: Date } {
  if (end.getTime() > start.getTime()) {
    return { start, end };
  }
  if (end.getTime() < start.getTime()) {
    return { start: end, end: start };
  }
  return { start, end: addMinutes(start, SCHEDULE_TIME_QUARTER_MINUTES) };
}

export function normalizeCreateRange(
  start: Date,
  end: Date,
  clickedWithoutDrag: boolean,
): { start: Date; end: Date } {
  if (clickedWithoutDrag) {
    return { start, end: addMinutes(start, 60) };
  }

  const preview = normalizeDragPreviewRange(start, end);
  return clampEndToSameDay(preview.start, preview.end);
}

function clampEndToSameDay(start: Date, end: Date): { start: Date; end: Date } {
  const dayEnd = startOfDay(start);
  dayEnd.setHours(23, 59, 0, 0);
  if (end.getTime() > dayEnd.getTime()) {
    return { start, end: dayEnd };
  }
  return { start, end };
}

export function formatScheduleTimeRange(start: Date, end: Date): { startTime: string; endTime: string } {
  return {
    startTime: format(start, "HH:mm"),
    endTime: format(end, "HH:mm"),
  };
}
