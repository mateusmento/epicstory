import { differenceInMinutes, formatDistanceToNow, isPast } from "date-fns";

/**
 * Human-readable countdown until a calendar occurrence (e.g. "in 5 minutes").
 */
export function formatEventStartsInLabel(occurrenceAt: string | Date | null | undefined): string {
  if (!occurrenceAt) return "soon";
  const when = occurrenceAt instanceof Date ? occurrenceAt : new Date(occurrenceAt);
  if (Number.isNaN(when.getTime())) return "soon";

  const now = new Date();
  if (isPast(when)) return "now";

  const mins = differenceInMinutes(when, now);
  if (mins <= 0) return "in less than a minute";
  if (mins === 1) return "in 1 minute";
  if (mins < 60) return `in ${mins} minutes`;

  return formatDistanceToNow(when, { addSuffix: true });
}

/**
 * Completes "… is about to start ___" using {@link notifyMinutesBefore} from the calendar
 * event → scheduled job → notification chain (not wall-clock vs {@link occurrenceAt}, which
 * drifts after the notification is sent).
 */
export function formatStartsInFromNotifyMinutesBefore(
  notifyMinutesBefore: number | null | undefined,
): string | null {
  if (notifyMinutesBefore == null || notifyMinutesBefore < 0) return null;
  if (notifyMinutesBefore === 0) return "now";
  if (notifyMinutesBefore === 1) return "in 1 minute";
  return `in ${notifyMinutesBefore} minutes`;
}

/**
 * Prefer configured heads-up minutes; fall back to live countdown for legacy payloads.
 */
export function resolveCalendarReminderStartsInLabel(
  notifyMinutesBefore: number | null | undefined,
  occurrenceAt: string | Date | null | undefined,
): string {
  const fromNotify = formatStartsInFromNotifyMinutesBefore(notifyMinutesBefore);
  if (fromNotify != null) return fromNotify;
  return formatEventStartsInLabel(occurrenceAt);
}
