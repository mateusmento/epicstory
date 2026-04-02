import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { UUID } from 'crypto';
import { isFuture } from 'date-fns';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';
import { assertCalendarMeetingAccess } from '../utils/assert-calendar-meeting-access';

export class GetCalendarMeetingLobby {
  @IsString()
  calendarEventId: UUID;

  @Type(() => Date)
  @IsDate()
  occurrenceAt: Date;

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

    const event = await calendarRepo.findOne({
      where: { id: query.calendarEventId },
      relations: { participants: true },
    });
    if (!event) throw new BadRequestException('Calendar event not found');

    const channelId = (event.payload as any)?.channelId ?? null;

    await assertCalendarMeetingAccess({
      dataSource: this.dataSource,
      workspaceRepo: this.workspaceRepo,
      issuerId: query.issuerId,
      event,
      channelId,
    });

    const meeting = await meetingRepo.findOne({
      where: {
        calendarEventId: event.id as any,
        scheduledStartsAt: query.occurrenceAt as any,
      } as any,
      relations: { attendees: { user: true } } as any,
    });

    return {
      calendarEvent: event,
      occurrenceAt: query.occurrenceAt,
      meeting,
      joinable: !isFuture(query.occurrenceAt),
    };
  }
}
