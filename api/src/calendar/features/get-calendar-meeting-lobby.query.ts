import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UUID } from 'crypto';
import { isFuture } from 'date-fns';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';
import { assertCalendarMeetingAccess } from '../utils/assert-calendar-meeting-access';
import { ScheduledMeetingPayload } from '../types';
import { IsUndefinedIgnored } from 'src/core/validation';

export class GetCalendarMeetingLobby {
  @IsOptional()
  @IsUUID()
  calendarEventId?: UUID;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurrenceAt?: Date;

  @IsOptional()
  @IsNumber()
  meetingId?: number;

  issuerId: number;

  constructor(data: Partial<GetCalendarMeetingLobby>) {
    patch(this, data);
  }
}

@QueryHandler(GetCalendarMeetingLobby)
export class GetCalendarMeetingLobbyHandler
  implements IQueryHandler<GetCalendarMeetingLobby>
{
  constructor(
    private dataSource: DataSource,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute(query: GetCalendarMeetingLobby) {
    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const meetingRepo = this.dataSource.getRepository(Meeting);

    if (query.meetingId) {
      const meeting = await meetingRepo.findOne({
        where: { id: query.meetingId },
        relations: { attendees: { user: true } },
      });

      const event = await calendarRepo.findOne({
        where: { id: meeting.calendarEventId },
        relations: { participants: true },
      });

      return {
        calendarEvent: event,
        occurrenceAt: query.occurrenceAt,
        meeting,
        joinable: !isFuture(query.occurrenceAt),
      };
    }

    const event = await calendarRepo.findOne({
      where: { id: query.calendarEventId },
      relations: { participants: true },
    });
    if (!event) throw new BadRequestException('Calendar event not found');

    const channelId =
      (event.payload as ScheduledMeetingPayload)?.channelId ?? null;

    await assertCalendarMeetingAccess({
      dataSource: this.dataSource,
      workspaceRepo: this.workspaceRepo,
      issuerId: query.issuerId,
      event,
      channelId,
    });

    const meeting = await meetingRepo.findOne({
      where: {
        calendarEventId: event.id,
        scheduledStartsAt: query.occurrenceAt,
      },
      relations: { attendees: { user: true } },
    });

    return {
      calendarEvent: event,
      occurrenceAt: query.occurrenceAt,
      meeting,
      joinable: !isFuture(query.occurrenceAt),
    };
  }
}
