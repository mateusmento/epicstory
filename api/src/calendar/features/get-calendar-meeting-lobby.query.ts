import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { assertCalendarMeetingAccess } from '../utils/assert-calendar-meeting-access';

export class GetCalendarMeetingLobby {
  @IsString()
  calendarEventId: string;

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
      where: { id: query.calendarEventId as any },
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
        occurrenceStartsAt: query.occurrenceAt as any,
      } as any,
      relations: { attendees: { user: true } } as any,
    });

    return {
      calendarEvent: {
        id: event.id,
        workspaceId: event.workspaceId,
        channelId,
        title: event.title,
        description: event.description,
        isPublic: event.isPublic,
        notifyMinutesBefore: event.notifyMinutesBefore,
        participants: event.participants ?? [],
      },
      occurrenceAt: query.occurrenceAt,
      meeting,
    };
  }
}
