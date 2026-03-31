import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
} from 'class-validator';
import { UUID } from 'crypto';
import { pickBy } from 'lodash';
import { patch, patchEntity } from 'src/core/objects';
import { IsUndefinedIgnored } from 'src/core/validation';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledJob } from 'src/scheduling/entities';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { buildScheduledJobPayload } from 'src/scheduling/types/payload';
import { CalendarEvent } from '../entities';
import { CalendarEventRepository } from '../repositories';
import { mapCalendarRecurrenceToJob } from '../utils/map-calendar-recurrence-to-job';

export class UpdateCalendarEvent {
  eventId: UUID;

  userId: number;

  @IsUndefinedIgnored()
  @IsNotEmpty()
  title?: string;

  @IsUndefinedIgnored()
  @IsString()
  description?: string;

  @IsUndefinedIgnored()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsUndefinedIgnored()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsUndefinedIgnored()
  @IsBoolean()
  isPublic?: boolean;

  @IsUndefinedIgnored()
  @IsBoolean()
  notifyEnabled?: boolean;

  @IsUndefinedIgnored()
  @IsNumber()
  @IsPositive()
  notifyMinutesBefore?: number;

  @IsUndefinedIgnored()
  @IsObject()
  recurrence?: any;

  constructor(data: Partial<UpdateCalendarEvent>) {
    patch(this, data);
  }
}

function patchCalendarEvent(
  event: CalendarEvent,
  partial: Partial<CalendarEvent>,
) {
  partial = pickBy(partial, (v) => v != null);
  patchEntity(event, partial);
  if (partial.notifyMinutesBefore)
    event.notifyMinutesBefore = Math.max(0, partial.notifyMinutesBefore ?? 0);
}

@CommandHandler(UpdateCalendarEvent)
export class UpdateCalendarEventCommand
  implements ICommandHandler<UpdateCalendarEvent>
{
  constructor(
    private calendarEventRepo: CalendarEventRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute({
    eventId,
    ...command
  }: UpdateCalendarEvent): Promise<CalendarEvent> {
    const event = await this.calendarEventRepo.findOne({
      where: { id: eventId },
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

    patchCalendarEvent(event, command);

    const saved = await this.calendarEventRepo.save(event);

    const existing = saved.scheduledJobId
      ? await this.scheduledJobRepo.findOneBy({
          id: saved.scheduledJobId,
          workspaceId: saved.workspaceId,
        })
      : null;

    if (!saved.notifyEnabled) {
      if (existing?.id) {
        await this.scheduledJobRepo.delete({ id: existing.id });
        saved.scheduledJob = null;
        await this.calendarEventRepo.save(saved);
      }
      return saved;
    } else {
      this.updateScheduledJob(saved, existing, scheduleChanged);
    }

    return saved;
  }

  async updateScheduledJob(
    event: CalendarEvent,
    job: ScheduledJob,
    scheduleChanged: boolean,
  ) {
    const notifyMinutesBefore = Math.max(0, event.notifyMinutesBefore ?? 0);
    const mapped = mapCalendarRecurrenceToJob({
      startsAt: event.startsAt,
      notifyMinutesBefore,
      recurrence: event.recurrence,
    });

    const desiredType =
      event.type === 'meeting'
        ? ScheduledJobTypes.meeting_reminder
        : ScheduledJobTypes.calendar_event_reminder;

    if (job) {
      job.dueAt = mapped.dueAt;
      job.notifyMinutesBefore = notifyMinutesBefore;
      job.recurrence = mapped.recurrence;
      job.processed = false;
      if (scheduleChanged) job.lastRunAt = null;
      await this.scheduledJobRepo.save(job);
    } else {
      const created = await this.scheduledJobRepo.save(
        ScheduledJob.create({
          type: desiredType,
          workspaceId: event.workspaceId,
          dueAt: mapped.dueAt,
          notifyMinutesBefore,
          recurrence: mapped.recurrence,
          payload: buildScheduledJobPayload(desiredType, {
            calendarEventId: event.id,
          }),
        }),
      );

      event.scheduledJob = created;
      await this.calendarEventRepo.save(event);
    }
  }
}
