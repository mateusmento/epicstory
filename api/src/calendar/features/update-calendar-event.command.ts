import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { patch } from 'src/core/objects';
import { CalendarEvent } from '../entities';
import { CalendarEventRepository } from '../repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { ScheduledJob } from 'src/scheduling/entities';
import { addMinutes } from 'date-fns';
import type { Recurrence as JobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import type { CalendarEventPayload } from '../types';

export class UpdateCalendarEvent {
  // id is validated by ParseUUIDPipe in the controller, not here
  id: string;

  userId: number;

  @IsOptional()
  @IsIn(['event', 'meeting'])
  type?: 'event' | 'meeting';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  payload?: Partial<CalendarEventPayload>;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  notifyMinutesBefore?: number;

  @IsOptional()
  @IsObject()
  recurrence?: any;

  constructor(data: Partial<UpdateCalendarEvent>) {
    patch(this, data);
  }
}

@CommandHandler(UpdateCalendarEvent)
export class UpdateCalendarEventCommand
  implements ICommandHandler<UpdateCalendarEvent>
{
  constructor(
    private calendarEventRepo: CalendarEventRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute(command: UpdateCalendarEvent): Promise<CalendarEvent> {
    const event = await this.calendarEventRepo.findOne({
      where: { id: command.id as any },
    });

    if (!event) {
      throw new BadRequestException('Calendar event not found');
    }
    if (event.createdById !== command.userId) {
      throw new ForbiddenException();
    }

    const scheduleChanged =
      command.startsAt !== undefined ||
      command.endsAt !== undefined ||
      command.recurrence !== undefined ||
      command.notifyMinutesBefore !== undefined;

    if (command.type !== undefined) event.type = command.type as any;
    if (command.title !== undefined) event.title = command.title ?? '';
    if (command.description !== undefined)
      event.description = command.description ?? '';
    if (command.payload !== undefined) {
      event.payload = {
        ...(event.payload ?? {}),
        ...(command.payload ?? {}),
        // Keep payload.type stable for older clients that still rely on it.
        type: event.payload?.type ?? 'calendar_event',
        // Ensure required payload fields are always present.
        channelId: event.payload?.channelId ?? null,
      };
    }
    if (command.startsAt !== undefined) event.startsAt = command.startsAt;
    if (command.endsAt !== undefined) event.endsAt = command.endsAt;
    if (command.isPublic !== undefined)
      event.isPublic = Boolean(command.isPublic);
    if (command.notifyEnabled !== undefined)
      event.notifyEnabled = Boolean(command.notifyEnabled);
    if (command.notifyMinutesBefore !== undefined)
      event.notifyMinutesBefore = Math.max(
        0,
        Number(command.notifyMinutesBefore),
      );
    if (command.recurrence !== undefined)
      event.recurrence = (command.recurrence ?? { frequency: 'once' }) as any;

    const saved = await this.calendarEventRepo.save(event);

    // Manage reminder job (one per series). If disabled, ensure jobs are removed.
    const jobTypes = ['calendar.meeting-reminder', 'calendar.event-reminder'];
    const existing = await this.scheduledJobRepo
      .createQueryBuilder('job')
      .where('job.type IN (:...types)', { types: jobTypes })
      .andWhere('job.workspaceId = :workspaceId', {
        workspaceId: saved.workspaceId,
      })
      .andWhere(`job.payload->>'calendarEventId' = :calendarEventId`, {
        calendarEventId: saved.id as any,
      })
      .getOne();

    if (!saved.notifyEnabled) {
      if (existing) {
        await this.scheduledJobRepo.delete({ id: existing.id as any } as any);
      }
      return saved;
    }

    const notifyMinutesBefore = Math.max(0, saved.notifyMinutesBefore ?? 0);
    const mapped = mapCalendarRecurrenceToJob({
      startsAt: saved.startsAt,
      notifyMinutesBefore,
      recurrence: saved.recurrence,
    });
    const desiredType =
      saved.type === 'meeting'
        ? 'calendar.meeting-reminder'
        : 'calendar.event-reminder';

    if (existing) {
      if (existing.type !== desiredType) {
        await this.scheduledJobRepo.delete({ id: existing.id as any } as any);
        await this.scheduledJobRepo.save(
          ScheduledJob.create({
            type: desiredType,
            workspaceId: saved.workspaceId,
            dueAt: mapped.dueAt,
            notifyMinutesBefore,
            recurrence: mapped.recurrence,
            payload: { calendarEventId: saved.id },
          }),
        );
      } else {
        existing.dueAt = mapped.dueAt;
        existing.notifyMinutesBefore = notifyMinutesBefore;
        existing.recurrence = mapped.recurrence as any;
        existing.processed = false;
        if (scheduleChanged) existing.lastRunAt = null;
        await this.scheduledJobRepo.save(existing);
      }
    } else {
      await this.scheduledJobRepo.save(
        ScheduledJob.create({
          type: desiredType,
          workspaceId: saved.workspaceId,
          dueAt: mapped.dueAt,
          notifyMinutesBefore,
          recurrence: mapped.recurrence,
          payload: { calendarEventId: saved.id },
        }),
      );
    }

    return saved;
  }
}

function toTimeOfDay(d: Date) {
  // Store as UTC wall-clock time (HH:mm:ss), independent of server/local TZ.
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const mm = d.getUTCMinutes().toString().padStart(2, '0');
  const ss = d.getUTCSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function mapCalendarRecurrenceToJob(args: {
  startsAt: Date;
  notifyMinutesBefore: number;
  recurrence: any;
}): { dueAt: Date; recurrence: JobRecurrence } {
  const reminderAt = addMinutes(
    args.startsAt,
    -Math.max(0, args.notifyMinutesBefore),
  );
  const freq = args.recurrence?.frequency ?? 'once';
  if (freq === 'once')
    return { dueAt: reminderAt, recurrence: { frequency: 'once' } };
  if (freq === 'daily') {
    return {
      dueAt: reminderAt,
      recurrence: {
        frequency: 'daily',
        interval: Math.max(1, Number(args.recurrence?.interval ?? 1)),
        timeOfDay: toTimeOfDay(reminderAt),
        until: args.recurrence?.until,
      },
    };
  }
  if (freq === 'weekly') {
    const by = Array.isArray(args.recurrence?.byWeekday)
      ? args.recurrence.byWeekday
      : [args.startsAt.getUTCDay()];
    return {
      dueAt: reminderAt,
      recurrence: {
        frequency: 'weekly',
        interval: Math.max(1, Number(args.recurrence?.interval ?? 1)),
        weekdays: by.length ? by : [args.startsAt.getUTCDay()],
        timeOfDay: toTimeOfDay(reminderAt),
        until: args.recurrence?.until,
      },
    };
  }
  return { dueAt: reminderAt, recurrence: { frequency: 'once' } };
}
