import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { MeetingRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';
import { CalendarEventRepository } from '../repositories';
import { assertCalendarMeetingAccess } from '../utils/assert-calendar-meeting-access';
import { ScheduledMeetingPayload } from '../types';
import { addMilliseconds, differenceInMilliseconds } from 'date-fns';

export class EnsureCalendarMeetingSession {
  @IsString()
  calendarEventId: string;

  @Type(() => Date)
  @IsDate()
  occurrenceAt: Date;

  issuerId: number;

  constructor(data: Partial<EnsureCalendarMeetingSession>) {
    patch(this, data);
  }
}

@CommandHandler(EnsureCalendarMeetingSession)
export class EnsureCalendarMeetingSessionCommand
  implements ICommandHandler<EnsureCalendarMeetingSession>
{
  constructor(
    private dataSource: DataSource,
    private workspaceRepo: WorkspaceRepository,
    private calendarRepo: CalendarEventRepository,
    private meetingRepo: MeetingRepository,
  ) {}

  async execute(command: EnsureCalendarMeetingSession) {
    const event = await this.calendarRepo.findOne({
      where: { id: command.calendarEventId as any, type: 'meeting' },
      relations: { participants: true },
    });
    if (!event) throw new BadRequestException('Calendar event not found');

    const payload = event.payload as ScheduledMeetingPayload;

    const channelId = payload.channelId;

    await assertCalendarMeetingAccess({
      dataSource: this.dataSource,
      workspaceRepo: this.workspaceRepo,
      issuerId: command.issuerId,
      event,
      channelId,
    });

    const occurrenceAt = command.occurrenceAt;

    const occurrenceEndsAt = event.duration()
      ? addMilliseconds(occurrenceAt, event.duration())
      : null;

    let meeting = await this.meetingRepo.findScheduled(event.id, occurrenceAt);

    if (!meeting) {
      const created = Meeting.create({
        workspaceId: event.workspaceId,
        calendarEventId: event.id as any,
        channelId,
        scheduledStartsAt: occurrenceAt,
        scheduledEndsAt: occurrenceEndsAt,
        // Keep legacy column aligned for now; scheduledStartsAt is the real occurrence identity.
        occurrenceAt,
      });
      // Ensure-session is a "create" step, never a "start" step.
      created.ongoing = false;
      created.startedAt = occurrenceAt;
      meeting = await this.meetingRepo.save(created);
    }

    return { meetingId: meeting.id };
  }
}
