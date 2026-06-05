import { parseDate } from "@/utils";
import type { ICalendarEvent, IMeeting } from "@epicstory/contracts";
import { addMilliseconds, isBefore, isFuture } from "date-fns";

type MeetingEndFields = Pick<IMeeting, "endedAt" | "scheduledEndsAt">;

type CalendarEventWindow = Pick<ICalendarEvent, "startsAt" | "endsAt">;

function calendarEventDurationMs(event: CalendarEventWindow): number | null {
  const start = parseDate(event.startsAt);
  const end = parseDate(event.endsAt);
  if (!start || !end) return null;
  const durationMs = end.getTime() - start.getTime();
  return durationMs > 0 ? durationMs : null;
}

/** True when an explicit end or scheduled window end is strictly before now. */
export function isMeetingEnded(meeting: MeetingEndFields, now: Date = new Date()): boolean {
  const endedAt = parseDate(meeting.endedAt);
  if (endedAt && isBefore(endedAt, now)) return true;

  const scheduledEndsAt = parseDate(meeting.scheduledEndsAt);
  if (scheduledEndsAt && isBefore(scheduledEndsAt, now)) return true;

  return false;
}

/**
 * True when a calendar occurrence's scheduled window has passed and no meeting row exists yet.
 * End is derived from the calendar event duration applied to this occurrence's start.
 */
export function isCalendarOccurrenceEnded(
  scheduledStartsAt: Date,
  calendarEvent: CalendarEventWindow,
  now = new Date(),
): boolean {
  const durationMs = calendarEventDurationMs(calendarEvent);
  if (!durationMs) return false;

  const scheduledEndsAt = addMilliseconds(scheduledStartsAt, durationMs);
  return isBefore(scheduledEndsAt, now);
}

/** Mirrors backend calendar meeting lobby joinability for a single occurrence. */
export function isScheduledMeetingOccurrenceJoinable({
  scheduledStartsAt,
  meeting,
  calendarEvent,
  now = new Date(),
}: {
  /** Occurrence identity; equals scheduled start for that calendar instance. */
  scheduledStartsAt: Date | string | null | undefined;
  meeting?: MeetingEndFields | null;
  calendarEvent?: CalendarEventWindow | null;
  now?: Date;
}): boolean {
  const startsAt = parseDate(scheduledStartsAt);
  if (!startsAt || isFuture(startsAt)) return false;

  if (meeting) {
    return !isMeetingEnded(meeting, now);
  }

  if (calendarEvent) {
    return !isCalendarOccurrenceEnded(startsAt, calendarEvent, now);
  }

  return true;
}

/** Scheduled/ad-hoc meeting that is still open for joining. */
export function isLiveJoinableMeeting(meeting: IMeeting, now: Date = new Date()): boolean {
  return meeting.ongoing && !isMeetingEnded(meeting, now);
}
