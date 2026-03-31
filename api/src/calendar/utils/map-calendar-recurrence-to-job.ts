import { addMinutes } from 'date-fns';
import type { ScheduledJobRecurrence as JobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { CalendarEventRecurrence } from '../entities';

function toTimeOfDayUtc(d: Date) {
  // Store as UTC wall-clock time (HH:mm:ss), independent of server/local TZ.
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const mm = d.getUTCMinutes().toString().padStart(2, '0');
  const ss = d.getUTCSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function mapCalendarRecurrenceToJob(args: {
  startsAt: Date;
  notifyMinutesBefore: number;
  recurrence: CalendarEventRecurrence;
}): { dueAt: Date; recurrence: JobRecurrence } {
  const reminderAt = addMinutes(
    args.startsAt,
    -Math.max(0, args.notifyMinutesBefore),
  );
  if (!args.recurrence?.frequency || args.recurrence?.frequency === 'once') {
    return { dueAt: reminderAt, recurrence: { frequency: 'once' } };
  }
  if (args.recurrence?.frequency === 'daily') {
    return {
      dueAt: reminderAt,
      recurrence: {
        frequency: 'daily',
        interval: Math.max(1, Number(args.recurrence?.interval ?? 1)),
        timeOfDay: toTimeOfDayUtc(reminderAt),
        until: args.recurrence?.until,
      },
    };
  }
  if (args.recurrence?.frequency === 'weekly') {
    const by = Array.isArray(args.recurrence?.byWeekday)
      ? args.recurrence.byWeekday
      : [args.startsAt.getUTCDay()];
    return {
      dueAt: reminderAt,
      recurrence: {
        frequency: 'weekly',
        interval: Math.max(1, Number(args.recurrence?.interval ?? 1)),
        weekdays: by.length ? by : [args.startsAt.getUTCDay()],
        timeOfDay: toTimeOfDayUtc(reminderAt),
        until: args.recurrence?.until,
      },
    };
  }
  return { dueAt: reminderAt, recurrence: { frequency: 'once' } };
}
