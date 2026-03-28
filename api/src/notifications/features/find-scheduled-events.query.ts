import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { patch } from 'src/core/objects';
import { ScheduledEventRepository } from '../repositories';

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

function expandRecurringDueAts(args: {
  startsAt: Date;
  recurrence: CalendarEventRecurrence | null;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { startsAt, recurrence, rangeStart, rangeEnd } = args;
  const out: Date[] = [];
  const maxEnd = clampRangeEnd(rangeEnd, (recurrence as any)?.until);

  if (!recurrence || recurrence.frequency === 'once') {
    if (!isBefore(startsAt, rangeStart) && !isAfter(startsAt, maxEnd))
      out.push(startsAt);
    return out;
  }

  if (recurrence.frequency === 'daily') {
    const interval = Math.max(1, Number(recurrence.interval ?? 1));
    // Iterate by day in the visible window (ranges are small: calendar view).
    for (
      let cur = startsAt;
      !isAfter(cur, maxEnd);
      cur = addDays(cur, interval)
    ) {
      if (isBefore(cur, rangeStart)) continue;
      out.push(cur);
    }
    return out;
  }

  if (recurrence.frequency === 'weekly') {
    const intervalWeeks = Math.max(1, Number(recurrence.interval ?? 1));
    const by = new Set((recurrence.byWeekday ?? []).map((x) => Number(x)));
    if (by.size === 0) by.add(dayOfWeek(startsAt));

    const baseWeekStart = startOfDay(startsAt).getTime();
    for (
      let curDay = startOfDay(rangeStart);
      !isAfter(curDay, maxEnd);
      curDay = addDays(curDay, 1)
    ) {
      const weeksSinceBase = Math.floor(
        (curDay.getTime() - baseWeekStart) / (7 * 24 * 3600 * 1000),
      );
      if (weeksSinceBase < 0) continue;
      if (weeksSinceBase % intervalWeeks !== 0) continue;
      if (!by.has(dayOfWeek(curDay))) continue;

      const cur = new Date(curDay);
      cur.setHours(
        startsAt.getHours(),
        startsAt.getMinutes(),
        startsAt.getSeconds(),
        startsAt.getMilliseconds(),
      );

      if (isBefore(cur, startsAt)) continue;
      if (isBefore(cur, rangeStart) || isAfter(cur, maxEnd)) continue;
      out.push(cur);
    }

    // Ensure the first occurrence is included if it falls within range.
    if (
      !out.some((d) => d.getTime() === startsAt.getTime()) &&
      !isBefore(startsAt, rangeStart) &&
      !isAfter(startsAt, maxEnd)
    ) {
      out.unshift(startsAt);
    }

    // Deduplicate
    const seen = new Set<number>();
    return out.filter((d) => {
      const t = d.getTime();
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }

  return out;
}

export class FindScheduledEvents {
  @IsNumber()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  userId: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  constructor(data: Partial<FindScheduledEvents>) {
    patch(this, data);
  }
}

@QueryHandler(FindScheduledEvents)
export class FindScheduledEventsHandler
  implements IQueryHandler<FindScheduledEvents>
{
  constructor(
    private readonly scheduledEventRepository: ScheduledEventRepository,
  ) {}

  async execute(query: FindScheduledEvents): Promise<any[]> {
    // Calendar events only (exclude scheduler jobs like issue_due_date, meeting reminders, etc)
    const qb = this.scheduledEventRepository
      .createQueryBuilder('event')
      .where('event.userId = :userId', { userId: query.userId });

    qb.andWhere(
      "(event.payload->>'type' IS NULL OR event.payload->>'type' = 'calendar_event')",
    );

    if (query.endDate) {
      // Series must start on/before the visible end to have any occurrence in range.
      qb.andWhere('event.dueAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    qb.orderBy('event.dueAt', 'ASC');

    const series = await qb.getMany();

    // If range is not provided, return the series rows as-is (backwards compatible).
    if (!query.startDate || !query.endDate) return series;

    const rangeStart = query.startDate;
    const rangeEnd = query.endDate;

    const expanded: any[] = [];
    for (const ev of series) {
      const recurrence = (ev.payload as any)?.recurrence as
        | CalendarEventRecurrence
        | null
        | undefined;

      const dueAts = expandRecurringDueAts({
        startsAt: ev.dueAt,
        recurrence: recurrence ?? null,
        rangeStart,
        rangeEnd,
      });

      // No recurrence: keep stable id.
      if (!recurrence || recurrence.frequency === 'once') {
        if (dueAts.length === 0) continue;
        expanded.push({
          ...ev,
          payload: {
            ...(ev.payload ?? {}),
            seriesId: (ev.id as any) ?? undefined,
            occurrenceAt: ev.dueAt?.toISOString?.() ?? undefined,
          },
        });
        continue;
      }

      for (const dueAt of dueAts) {
        expanded.push({
          ...ev,
          id: `${ev.id}:${dueAt.toISOString()}`,
          dueAt,
          payload: {
            ...(ev.payload ?? {}),
            seriesId: (ev.id as any) ?? undefined,
            occurrenceAt: dueAt.toISOString(),
          },
        });
      }
    }

    expanded.sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    );

    return expanded;
  }
}
