import {
  addDays,
  endOfWeek as dateFnsEndOfWeek,
  startOfWeek as dateFnsStartOfWeek,
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { SCHEDULE_MONTH_GRID_DAYS, SCHEDULE_WEEK_STARTS_ON, type ScheduleViewType } from "./constants";

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

export function computeMonthWeekdayLabels(): string[] {
  const base = dateFnsStartOfWeek(new Date(), { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => format(addDays(base, i), "EEE"));
}

export function computeWeekDays(currentDate: Date): Date[] {
  const date = normalizeScheduleDay(currentDate);
  const weekStart = dateFnsStartOfWeek(date, { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
}

export function formatScheduleHeader(view: ScheduleViewType, currentDate: Date): string {
  const date = normalizeScheduleDay(currentDate);
  if (view === "month") {
    return format(date, "MMMM yyyy");
  }
  if (view === "week") {
    const days = computeWeekDays(date);
    return `${format(days[0], "MMM d")} - ${format(days[6], "MMM d, yyyy")}`;
  }
  return format(date, "EEEE, MMMM d, yyyy");
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
