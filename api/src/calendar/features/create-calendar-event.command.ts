import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';
import { addMinutes } from 'date-fns';
import { uniq } from 'lodash';
import { patch } from 'src/core/objects';
import { ScheduledJob } from 'src/scheduling/entities';
import type { Recurrence as JobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { CalendarEvent } from '../entities';
import type { CalendarEventType } from '../entities/calendar-event.entity';
import { CalendarEventRepository } from '../repositories';
import type { CalendarEventPayload } from '../types';

export class CreateCalendarEvent {
  issuerId: number;

  @IsNumber()
  workspaceId: number;

  @IsOptional()
  @IsIn(['event', 'meeting'])
  type?: CalendarEventType;

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

  async execute(command: CreateCalendarEvent): Promise<CalendarEvent> {
    const member = await this.workspaceRepo.findMember(
      command.workspaceId,
      command.issuerId,
      { user: true },
    );
    if (!member) throw new Error('Issuer is not a workspace member');

    const userIds = uniq([command.issuerId, ...command.participantIds]);
    const participants = await this.workspaceRepo.findMembers(
      {
        workspaceId: command.workspaceId,
        userIds,
      },
      { user: true },
    );

    const participantUsers = participants.map((p) => p.user);

    const payload: CalendarEventPayload = {
      ...(command.payload ?? {}),
      channelId: command.channelId ?? null,
    };

    const event = await this.calendarEventRepo.save(
      CalendarEvent.create({
        workspaceId: command.workspaceId,
        payload,
        type: (command.type ?? 'event') as any,
        startsAt: command.startsAt,
        endsAt: command.endsAt,
        isPublic: command.isPublic ?? true,
        notifyEnabled: command.notifyEnabled ?? true,
        notifyMinutesBefore: command.notifyMinutesBefore ?? 10,
        recurrence: command.recurrence ?? { frequency: 'once' },
        participants: participantUsers,
        createdById: command.issuerId,
        title: command.title,
        description: command.description ?? '',
      }),
    );

    // Schedule ONE recurring reminder job per series (no chaining).
    // Recurring jobs advance using last_run_at.
    if (!event.notifyEnabled) return event;

    const notifyMinutesBefore = Math.max(0, event.notifyMinutesBefore ?? 0);
    const mapped = mapCalendarRecurrenceToJob({
      startsAt: event.startsAt,
      notifyMinutesBefore,
      recurrence: event.recurrence,
    });

    const type =
      event.type === 'meeting'
        ? 'calendar.meeting-reminder'
        : 'calendar.event-reminder';

    await this.scheduledJobRepo.save(
      ScheduledJob.create({
        type,
        workspaceId: event.workspaceId,
        dueAt: mapped.dueAt,
        notifyMinutesBefore,
        recurrence: mapped.recurrence,
        payload: { calendarEventId: event.id },
      }),
    );

    return event;
  }
}

function toTimeOfDay(d: Date) {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
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
  if (freq === 'once') {
    return { dueAt: reminderAt, recurrence: { frequency: 'once' } };
  }
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
      : [args.startsAt.getDay()];
    return {
      dueAt: reminderAt,
      recurrence: {
        frequency: 'weekly',
        interval: Math.max(1, Number(args.recurrence?.interval ?? 1)),
        weekdays: by.length ? by : [args.startsAt.getDay()],
        timeOfDay: toTimeOfDay(reminderAt),
        until: args.recurrence?.until,
      },
    };
  }
  return { dueAt: reminderAt, recurrence: { frequency: 'once' } };
}
