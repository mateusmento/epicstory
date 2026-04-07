import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsBoolean,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { uniq } from 'lodash';
import { patch } from 'src/core/objects';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledJob } from 'src/scheduling/entities';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { buildScheduledJobPayload } from 'src/scheduling/types/payload';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { CalendarEvent } from '../entities';
import type { CalendarEventType } from '../entities/calendar-event.entity';
import { CalendarEventRepository } from '../repositories';
import { buildCalendarEventPayload, type CalendarEventPayload } from '../types';
import { mapCalendarRecurrenceToJob } from '../utils/map-calendar-recurrence-to-job';

export class CreateCalendarEvent {
  issuerId: number;

  @IsNumber()
  workspaceId: number;

  @IsIn(['event', 'meeting'])
  @Transform(({ value }) => value ?? 'event')
  type: CalendarEventType;

  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @Transform(({ value }) => value ?? {})
  payload: Partial<CalendarEventPayload>;

  @IsDate()
  startsAt: Date;

  @IsDate()
  endsAt: Date;

  @IsOptional()
  @IsNumber()
  channelId?: number | null;

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

  @IsOptional()
  @IsNumber({}, { each: true })
  @ArrayNotEmpty()
  @Transform(({ value }) => uniq(value ?? []))
  participantIds: number[];

  constructor(data: Partial<CreateCalendarEvent>) {
    patch(this, data);
  }
}

@CommandHandler(CreateCalendarEvent)
export class CreateCalendarEventCommand
  implements ICommandHandler<CreateCalendarEvent>
{
  constructor(
    private calendarEventRepo: CalendarEventRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute({
    workspaceId,
    channelId,
    issuerId,
    ...command
  }: CreateCalendarEvent): Promise<CalendarEvent> {
    const member = await this.workspaceRepo.findMember(workspaceId, issuerId, {
      user: true,
    });
    if (!member) throw new Error('Issuer is not a workspace member');

    const userIds = uniq([issuerId, ...(command.participantIds ?? [])]);
    const participants = await this.workspaceRepo.findMembers(
      { workspaceId, userIds },
      { user: true },
    );

    const participantUsers = participants.map((p) => p.user);

    const type = command.type ?? 'event';

    const payload: CalendarEventPayload = buildCalendarEventPayload(type, {
      ...command.payload,
      ...(channelId ? { channelId } : {}),
    });

    const event = await this.calendarEventRepo.save(
      CalendarEvent.create({
        workspaceId,
        type,
        payload,
        startsAt: command.startsAt,
        endsAt: command.endsAt,
        isPublic: command.isPublic ?? true,
        notifyEnabled: command.notifyEnabled ?? true,
        notifyMinutesBefore: command.notifyMinutesBefore ?? 10,
        recurrence: command.recurrence ?? { frequency: 'once' },
        participants: participantUsers,
        createdById: issuerId,
        title: command.title,
        description: command.description ?? '',
      }),
    );

    if (event.type === 'meeting') {
      await this.ensureMeetingJobs(event);
    } else if (event.notifyEnabled) {
      await this.ensureReminderJob(event);
    }

    return event;
  }

  private async ensureMeetingJobs(event: CalendarEvent) {
    // For meetings we want:
    // - meeting_start: always (materializes + starts the meeting and emits incoming-meeting)
    // - meeting_reminder: only if notifyEnabled (creates a non-ongoing meeting + sends notification)
    await this.ensureMeetingStartJob(event);
    if (event.notifyEnabled) await this.ensureMeetingReminderJob(event);
  }

  private async ensureReminderJob(event: CalendarEvent) {
    const notifyMinutesBefore = Math.max(0, event.notifyMinutesBefore ?? 0);
    const mapped = mapCalendarRecurrenceToJob({
      startsAt: event.startsAt,
      notifyMinutesBefore,
      recurrence: event.recurrence,
    });

    const type =
      event.type === 'meeting'
        ? ScheduledJobTypes.meeting_reminder
        : ScheduledJobTypes.calendar_event_reminder;

    const job = await this.scheduledJobRepo.save(
      ScheduledJob.create({
        type,
        workspaceId: event.workspaceId,
        dueAt: mapped.dueAt,
        notifyMinutesBefore,
        recurrence: mapped.recurrence,
        payload: buildScheduledJobPayload(type, {
          calendarEventId: event.id,
          ...event.payload,
        }),
      }),
    );

    event.scheduledJob = job;
    await this.calendarEventRepo.save(event);
  }

  private async ensureMeetingReminderJob(event: CalendarEvent) {
    // meeting_reminder uses notifyMinutesBefore; keep event.scheduledJob pointing to this reminder job.
    await this.ensureReminderJob(event);
  }

  private async ensureMeetingStartJob(event: CalendarEvent) {
    const mapped = mapCalendarRecurrenceToJob({
      startsAt: event.startsAt,
      notifyMinutesBefore: 0,
      recurrence: event.recurrence,
    });

    await this.scheduledJobRepo.save(
      ScheduledJob.create({
        type: ScheduledJobTypes.meeting_start,
        workspaceId: event.workspaceId,
        dueAt: mapped.dueAt,
        notifyMinutesBefore: 0,
        recurrence: mapped.recurrence,
        payload: buildScheduledJobPayload(ScheduledJobTypes.meeting_start, {
          calendarEventId: event.id,
          ...event.payload,
        }),
      }),
    );
  }
}
