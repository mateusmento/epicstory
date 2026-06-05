import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { UUID } from 'crypto';
import { addMilliseconds, isBefore, isFuture } from 'date-fns';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';
import { resolveCalendarOccurrenceAt } from '../utils/assert-calendar-occurrence';
import { assertCalendarMeetingAccess } from '../utils/assert-calendar-meeting-access';

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
        relations: { attendees: { user: true }, channel: true },
      });

      const event = await calendarRepo.findOne({
        where: { id: meeting.calendarEventId },
        relations: { participants: true },
      });

      const occurrenceAt =
        meeting.scheduledStartsAt ?? meeting.occurrenceAt ?? query.occurrenceAt;

      return {
        calendarEvent: event,
        occurrenceAt,
        meeting,
        joinable: this.isJoinable({ event, occurrenceAt, meeting }),
      };
    }

    const event = await calendarRepo.findOne({
      where: { id: query.calendarEventId },
      relations: { participants: true },
    });
    if (!event) throw new BadRequestException('Calendar event not found');

    await assertCalendarMeetingAccess({
      workspaceRepo: this.workspaceRepo,
      issuerId: query.issuerId,
      event,
    });

    const occurrenceAt = resolveCalendarOccurrenceAt(event, query.occurrenceAt);

    const meeting = await meetingRepo.findOne({
      where: {
        calendarEventId: event.id,
        scheduledStartsAt: occurrenceAt,
      },
      relations: { attendees: { user: true }, channel: true },
    });

    return {
      calendarEvent: event,
      occurrenceAt,
      meeting,
      joinable: this.isJoinable({
        event,
        occurrenceAt,
        meeting,
      }),
    };
  }

  private isJoinable({
    event,
    occurrenceAt,
    meeting,
    now = new Date(),
  }: {
    event: CalendarEvent | null;
    occurrenceAt?: Date | null;
    meeting: Meeting | null;
    now?: Date;
  }) {
    const scheduledStartsAt =
      meeting?.scheduledStartsAt ?? meeting?.occurrenceAt ?? occurrenceAt;
    if (!scheduledStartsAt || isFuture(scheduledStartsAt)) return false;

    if (meeting) {
      return !meeting.hasEnded(now);
    }

    if (event) {
      const durationMs = event.duration();
      if (durationMs) {
        const scheduledEndsAt = addMilliseconds(scheduledStartsAt, durationMs);
        if (isBefore(scheduledEndsAt, now)) return false;
      }
    }

    return true;
  }
}
