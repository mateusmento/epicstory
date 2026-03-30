import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { DataSource } from 'typeorm';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { CalendarEventRepository } from '../repositories';
import { MeetingRepository } from 'src/channel/infrastructure';
import { MeetingGateway } from 'src/channel/application/gateways';
import { assertCalendarMeetingAccess } from '../utils/assert-calendar-meeting-access';
import { CalendarMeetingPayload } from '../types';

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
    private meetingGateway: MeetingGateway,
  ) {}

  async execute(command: EnsureCalendarMeetingSession) {
    const event = await this.calendarRepo.findOne({
      where: { id: command.calendarEventId as any, type: 'meeting' },
      relations: { participants: true },
    });
    if (!event) throw new BadRequestException('Calendar event not found');

    const payload = event.payload as CalendarMeetingPayload;

    const channelId = payload.channelId;

    await assertCalendarMeetingAccess({
      dataSource: this.dataSource,
      workspaceRepo: this.workspaceRepo,
      issuerId: command.issuerId,
      event,
      channelId,
    });

    const occurrenceAt = command.occurrenceAt;

    let meeting = await this.meetingRepo.findMeeting(event.id, occurrenceAt);

    if (!meeting) {
      meeting = await this.meetingRepo.save(
        Meeting.scheduledFromCalendar({
          workspaceId: event.workspaceId,
          calendarEventId: event.id as any,
          occurrenceStartsAt: occurrenceAt,
          channelId,
        }),
      );
      this.meetingGateway.emitMeetingSessionStarted(meeting as any);
    }

    return { meetingId: meeting.id };
  }
}
