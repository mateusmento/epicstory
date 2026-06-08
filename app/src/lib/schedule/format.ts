import { addDays, format, startOfWeek as dateFnsStartOfWeek } from "date-fns";
import { SCHEDULE_WEEK_STARTS_ON } from "./constants";
import { computeWeekDays, normalizeScheduleDay } from "./date";
import type { ScheduleViewType } from "./types";

export function computeMonthWeekdayLabels(): string[] {
  const base = dateFnsStartOfWeek(new Date(), { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => format(addDays(base, i), "EEE"));
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
