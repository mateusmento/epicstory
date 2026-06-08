import type { LocationQueryValue } from "vue-router";
import { SCHEDULE_DEFAULT_VIEW, type ScheduleViewType } from "@/lib/schedule";

const VALID_VIEWS: ScheduleViewType[] = ["month", "week", "day"];

export function parseScheduleViewQuery(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): ScheduleViewType {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "month" || raw === "week" || raw === "day") return raw;
  return SCHEDULE_DEFAULT_VIEW;
}

export function isValidScheduleViewQuery(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw != null && raw !== "" && VALID_VIEWS.includes(raw as ScheduleViewType);
}
