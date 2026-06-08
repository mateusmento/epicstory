import type { ICalendarEvent } from "@epicstory/contracts";
import { SCHEDULE_PX_PER_MINUTE } from "./constants";

export function getEventEndTime(event: ICalendarEvent): Date {
  const startTime = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  if (!Number.isNaN(endsAt.getTime())) return endsAt;
  return new Date(startTime.getTime() + 60 * 60 * 1000);
}

export function getEventTopOffset(event: ICalendarEvent): number {
  const startTime = new Date(event.startsAt);
  return startTime.getMinutes() * SCHEDULE_PX_PER_MINUTE;
}

export function getEventDurationMinutes(event: ICalendarEvent): number {
  const startTime = new Date(event.startsAt);
  const endTime = getEventEndTime(event);
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = durationMs / (60 * 1000);
  if (!Number.isFinite(minutes)) return 60;
  return Math.max(1, minutes);
}

export function getEventHeightPx(event: ICalendarEvent, minPx: number): number {
  return Math.max(minPx, getEventDurationMinutes(event) * SCHEDULE_PX_PER_MINUTE);
}

export function getEventLayoutMode(event: ICalendarEvent): "tiny" | "small" | "normal" {
  const h = getEventDurationMinutes(event) * SCHEDULE_PX_PER_MINUTE;
  if (h < 22) return "tiny";
  if (h < 40) return "small";
  return "normal";
}
