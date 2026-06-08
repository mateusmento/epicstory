import type { ICalendarEvent, ICalendarEventRecurrence, RecurrenceFrequency } from "@epicstory/contracts";

export type ParsedRecurrence = {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday: number[];
};

function recurrenceFromEvent(event: ICalendarEvent): ICalendarEventRecurrence | undefined {
  return event.recurrence ?? (event.payload as { recurrence?: ICalendarEventRecurrence })?.recurrence;
}

export function parseRecurrenceFromEvent(
  event: ICalendarEvent,
  eventDate: Date,
  defaultFrequency: RecurrenceFrequency = "once",
): ParsedRecurrence {
  const rec = recurrenceFromEvent(event);
  if (rec?.frequency === "daily") {
    return {
      frequency: "daily",
      interval: Math.max(1, Number(rec.interval ?? 1)),
      byWeekday: [eventDate.getDay()],
    };
  }
  if (rec?.frequency === "weekly") {
    return {
      frequency: "weekly",
      interval: Math.max(1, Number(rec.interval ?? 1)),
      byWeekday: Array.isArray(rec.byWeekday) && rec.byWeekday.length ? rec.byWeekday : [eventDate.getDay()],
    };
  }
  if (rec?.frequency === "once") {
    return {
      frequency: "once",
      interval: 1,
      byWeekday: [eventDate.getDay()],
    };
  }
  return {
    frequency: defaultFrequency,
    interval: 1,
    byWeekday: [eventDate.getDay()],
  };
}

export function buildRecurrencePayload(
  frequency: RecurrenceFrequency,
  interval: number,
  byWeekday: number[],
  startsAt: Date,
): ICalendarEventRecurrence {
  if (frequency === "once") {
    return { frequency: "once" };
  }
  if (frequency === "daily") {
    return { frequency: "daily", interval: Math.max(1, interval) };
  }
  return {
    frequency: "weekly",
    interval: Math.max(1, interval),
    byWeekday: byWeekday.length ? byWeekday : [startsAt.getDay()],
  };
}

export function toggleWeekdayInList(current: number[], day: number, enabled: boolean): number[] {
  const set = new Set(current);
  if (enabled) set.add(day);
  else set.delete(day);
  return Array.from(set.values()).sort((a, b) => a - b);
}
