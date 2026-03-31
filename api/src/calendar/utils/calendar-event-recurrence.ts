import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';
import { sortBy, uniqBy } from 'lodash';

type CalendarEventRecurrence =
  | { frequency: 'once'; until?: string }
  | { frequency: 'daily'; interval?: number; until?: string }
  | {
      frequency: 'weekly';
      interval?: number;
      byWeekday?: number[];
      until?: string;
    };

function parseUntil(until?: string) {
  if (!until) return null;
  const d = new Date(until);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dayOfWeek(d: Date) {
  return d.getDay(); // 0..6
}

function clampRangeEnd(rangeEnd: Date, until?: string) {
  const untilDate = parseUntil(until);
  if (!untilDate) return rangeEnd;
  return isBefore(untilDate, rangeEnd) ? untilDate : rangeEnd;
}

function isWithinRangeInclusive(d: Date, start: Date, end: Date) {
  return !isBefore(d, start) && !isAfter(d, end);
}

function setTimeOfDay(baseDay: Date, timeSource: Date) {
  const d = new Date(baseDay);
  d.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );
  return d;
}

function expandOnce(args: {
  startsAt: Date;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { startsAt, rangeStart, rangeEnd } = args;
  return isWithinRangeInclusive(startsAt, rangeStart, rangeEnd)
    ? [startsAt]
    : [];
}

function expandDaily(args: {
  startsAt: Date;
  interval: number;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { startsAt, interval, rangeStart, rangeEnd } = args;
  if (interval <= 0) return [];

  const out: Date[] = [];

  // Jump directly to the first occurrence >= rangeStart to avoid iterating from a far-past startsAt.
  let cur = startsAt;
  if (isBefore(cur, rangeStart)) {
    const dayDiff = Math.max(0, differenceInCalendarDays(rangeStart, cur));
    const k = Math.floor(dayDiff / interval) * interval;
    cur = addDays(cur, k);
    if (isBefore(cur, rangeStart)) cur = addDays(cur, interval);
  }

  for (; !isAfter(cur, rangeEnd); cur = addDays(cur, interval)) {
    if (isBefore(cur, rangeStart)) continue;
    out.push(cur);
  }
  return out;
}

function expandWeekly(args: {
  startsAt: Date;
  intervalWeeks: number;
  byWeekday: number[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { startsAt, intervalWeeks, byWeekday, rangeStart, rangeEnd } = args;
  if (intervalWeeks <= 0) return [];

  const by = new Set((byWeekday ?? []).map((x) => Number(x)));
  if (by.size === 0) by.add(dayOfWeek(startsAt));

  const baseWeekStart = startOfDay(startsAt).getTime();
  const days = eachDayOfInterval({
    start: startOfDay(rangeStart),
    end: startOfDay(rangeEnd),
  });

  const out = days
    .filter((curDay) => {
      const weeksSinceBase = Math.floor(
        (startOfDay(curDay).getTime() - baseWeekStart) / (7 * 24 * 3600 * 1000),
      );
      if (weeksSinceBase < 0) return false;
      if (weeksSinceBase % intervalWeeks !== 0) return false;
      if (!by.has(dayOfWeek(curDay))) return false;
      return true;
    })
    .map((curDay) => setTimeOfDay(curDay, startsAt))
    .filter((cur) => !isBefore(cur, startsAt))
    .filter((cur) => isWithinRangeInclusive(cur, rangeStart, rangeEnd));

  // Ensure the first occurrence is included if it falls within range.
  const withStartsAt = isWithinRangeInclusive(startsAt, rangeStart, rangeEnd)
    ? [startsAt, ...out]
    : out;

  // Deduplicate + keep chronological order.
  const ordered = sortBy(withStartsAt, (d) => d.getTime());
  return uniqBy(ordered, (d) => d.getTime());
}

export function expandRecurringEvent(args: {
  startsAt: Date;
  recurrence: CalendarEventRecurrence | null;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { startsAt, recurrence, rangeStart, rangeEnd } = args;
  const maxEnd = clampRangeEnd(rangeEnd, (recurrence as any)?.until);

  if (!recurrence || recurrence.frequency === 'once') {
    return expandOnce({ startsAt, rangeStart, rangeEnd: maxEnd });
  }

  if (recurrence.frequency === 'daily') {
    const interval = Math.max(1, Number(recurrence.interval ?? 1));
    return expandDaily({
      startsAt,
      interval,
      rangeStart,
      rangeEnd: maxEnd,
    });
  }

  if (recurrence.frequency === 'weekly') {
    const intervalWeeks = Math.max(1, Number(recurrence.interval ?? 1));
    return expandWeekly({
      startsAt,
      intervalWeeks,
      byWeekday: recurrence.byWeekday ?? [],
      rangeStart,
      rangeEnd: maxEnd,
    });
  }

  return [];
}
