import {
  addDays,
  endOfWeek as dateFnsEndOfWeek,
  startOfWeek as dateFnsStartOfWeek,
  eachDayOfInterval,
  endOfDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { SCHEDULE_MONTH_GRID_DAYS, SCHEDULE_WEEK_STARTS_ON } from "./constants";
import type { ScheduleViewType } from "./types";

/** Normalize to local midnight — schedule state always uses day-level dates. */
export function normalizeScheduleDay(date: Date): Date {
  return startOfDay(date);
}

export function todayInLocalTz(): Date {
  return startOfDay(new Date());
}

export function computeDateRange(view: ScheduleViewType, currentDate: Date): { start: Date; end: Date } {
  const date = normalizeScheduleDay(currentDate);
  let start: Date;
  let end: Date;

  if (view === "month") {
    const monthStart = dateFnsStartOfWeek(startOfMonth(date), { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
    start = monthStart;
    end = addDays(monthStart, SCHEDULE_MONTH_GRID_DAYS - 1);
  } else if (view === "week") {
    start = dateFnsStartOfWeek(date, { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
    end = dateFnsEndOfWeek(date, { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  } else {
    start = startOfDay(date);
    end = endOfDay(date);
  }

  return { start, end };
}

export function computeActiveMonthAnchor(currentDate: Date): Date {
  return startOfMonth(normalizeScheduleDay(currentDate));
}

export function computeMonthGridDays(range: { start: Date; end: Date }): Date[] {
  return eachDayOfInterval({ start: range.start, end: range.end });
}

export function computeWeekDays(currentDate: Date): Date[] {
  const date = normalizeScheduleDay(currentDate);
  const weekStart = dateFnsStartOfWeek(date, { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
}

export function shiftScheduleDate(view: ScheduleViewType, currentDate: Date, direction: -1 | 1): Date {
  const date = normalizeScheduleDay(currentDate);
  let next: Date;
  if (view === "month") {
    next = new Date(date);
    next.setMonth(next.getMonth() + direction);
  } else if (view === "week") {
    next = addDays(date, direction * 7);
  } else {
    next = addDays(date, direction);
  }
  return normalizeScheduleDay(next);
}
