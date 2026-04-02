import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import {
  addMilliseconds,
  compareAsc,
  differenceInMilliseconds,
} from 'date-fns';
import { patch } from 'src/core/objects';
import { CalendarEventRepository } from '../repositories';
import { expandRecurringEvent } from '../utils/calendar-event-recurrence';

export class FindCalendarEvents {
  issuerId: number;

  @IsNumber()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  workspaceId: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  constructor(data: Partial<FindCalendarEvents>) {
    patch(this, data);
  }
}

@QueryHandler(FindCalendarEvents)
export class FindCalendarEventsHandler
  implements IQueryHandler<FindCalendarEvents>
{
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
  ) {}

  async execute({ issuerId, workspaceId, ...query }: FindCalendarEvents) {
    const qb = this.calendarEventRepository
      .createQueryBuilder('event')
      .where('event.workspaceId = :workspaceId', { workspaceId })
      .leftJoin('event.participants', 'participant')
      .andWhere('(event.createdById = :userId OR participant.id = :userId)', {
        userId: issuerId,
      });

    if (query.endDate) {
      // Series must start on/before the visible end to have any occurrence in range.
      qb.andWhere('event.startsAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    qb.orderBy('event.startsAt', 'ASC');

    const series = (await qb.getMany()).map((ev: any) => ({
      ...ev,
      // Stable "this occurrence" id for UI rendering (series row = one occurrence).
      occurrenceId: ev.id ?? undefined,
    }));

    // If range is not provided, return the series rows as-is (backwards compatible).
    if (!query.startDate || !query.endDate) return series;

    const rangeStart = query.startDate;
    const rangeEnd = query.endDate;

    const expanded = series
      .map((event: any) => {
        const recurrence = event.recurrence;
        const occurrenceAts = expandRecurringEvent({
          startsAt: event.startsAt,
          recurrence: recurrence ?? null,
          rangeStart,
          rangeEnd,
        });
        const durationMs = Math.max(
          0,
          differenceInMilliseconds(event.endsAt, event.startsAt),
        );
        return { event, recurrence, occurrenceAts, durationMs };
      })
      .filter((x) => x.occurrenceAts.length > 0)
      .flatMap(({ event, recurrence, occurrenceAts, durationMs }) => {
        // No recurrence / once: return the series row as-is (stable DB id).
        if (!recurrence || recurrence.frequency === 'once') return [event];

        // Recurring: expand to one row per occurrence in the visible window.
        return occurrenceAts.map((occurrenceAt) => ({
          ...event,
          startsAt: occurrenceAt,
          endsAt: addMilliseconds(occurrenceAt, durationMs),
          occurrenceId: `${event.id}:${occurrenceAt.toISOString()}`,
        }));
      })
      .sort((a: any, b: any) => compareAsc(a.startsAt, b.startsAt));

    return expanded;
  }
}
