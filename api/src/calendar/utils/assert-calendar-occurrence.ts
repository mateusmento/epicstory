import { BadRequestException } from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';
import type {
  CalendarEvent,
  CalendarEventRecurrence,
} from '../entities/calendar-event.entity';
import { expandRecurringEvent } from './calendar-event-recurrence';

/** Resolves the occurrence start for a calendar-backed meeting. */
export function resolveCalendarOccurrenceAt(
  event: CalendarEvent,
  occurrenceAt?: Date | null,
): Date {
  if (event.isNonRecurrent()) {
    return event.startsAt;
  }

  if (!occurrenceAt) {
    throw new BadRequestException(
      'occurrenceAt is required for recurring calendar events',
    );
  }

  assertCalendarOccurrenceAt(event, occurrenceAt);
  return occurrenceAt;
}

export function isCalendarOccurrenceAt(
  event: { startsAt: Date; recurrence?: CalendarEventRecurrence | null },
  occurrenceAt: Date,
): boolean {
  const occurrences = expandRecurringEvent({
    startsAt: event.startsAt,
    recurrence: event.recurrence ?? null,
    rangeStart: startOfDay(occurrenceAt),
    rangeEnd: endOfDay(occurrenceAt),
  });

  const target = occurrenceAt.getTime();
  return occurrences.some((occurrence) => occurrence.getTime() === target);
}

export function assertCalendarOccurrenceAt(
  event: { startsAt: Date; recurrence?: CalendarEventRecurrence | null },
  occurrenceAt: Date,
): void {
  if (!isCalendarOccurrenceAt(event, occurrenceAt)) {
    throw new BadRequestException('Invalid calendar event occurrence');
  }
}
