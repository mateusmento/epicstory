import { ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { compact, take, uniqBy } from 'lodash';
import { CalendarEvent } from 'src/calendar/entities';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { DataSource } from 'typeorm';
import {
  ChannelRepository,
  MeetingRepository,
} from '../../infrastructure/repositories';
import { Meeting } from 'src/channel/domain';

export type LiveScheduledMeetingDto = {
  meeting: Meeting;
  calendarEvent: CalendarEvent;
  participantsPreview: Array<{
    id: number;
    name: string;
    picture?: string | null;
  }>;
};

export class FindLiveScheduledMeeting {
  @IsNumber()
  workspaceId: number;

  @IsNumber()
  issuerId: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  now?: Date;

  constructor(data: Partial<FindLiveScheduledMeeting>) {
    patch(this, data);
  }
}

@QueryHandler(FindLiveScheduledMeeting)
export class FindLiveScheduledMeetingHandler
  implements IQueryHandler<FindLiveScheduledMeeting>
{
  constructor(
    private meetingRepo: MeetingRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private dataSource: DataSource,
  ) {}

  async execute(
    query: FindLiveScheduledMeeting,
  ): Promise<LiveScheduledMeetingDto | null> {
    const now = query.now ?? new Date();

    const member = await this.workspaceRepo.findMember(
      query.workspaceId,
      query.issuerId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    const meeting = await this.meetingRepo
      .createQueryBuilder('m')
      // Scheduled-only: calendar-backed meeting session.
      .innerJoin(CalendarEvent, 'ev', 'ev.id = m.calendar_event_id')
      .where('m.workspaceId = :workspaceId', { workspaceId: query.workspaceId })
      .andWhere('m.ongoing = true')
      .andWhere('m.startsAt <= :now', { now })
      .andWhere('m.calendar_event_id IS NOT NULL')
      .andWhere(
        `(
          (
            m.channel_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM channel.channel_peers cp
              WHERE cp.channel_id = m.channel_id
                AND cp.users_id = :userId
            )
          )
          OR
          (
            m.channel_id IS NULL
            AND (
              ev.createdById = :userId
              OR EXISTS (
                SELECT 1
                FROM calendar.calendar_event_participants cep
                WHERE cep.calendar_event_id = m.calendar_event_id
                  AND cep.user_id = :userId
              )
            )
          )
        )`,
        { userId: query.issuerId },
      )
      .orderBy('m.startsAt', 'ASC')
      .getOne();

    if (!meeting || !meeting.calendarEventId || !meeting.occurrenceAt)
      return null;

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const event = await calendarRepo.findOne({
      where: { id: meeting.calendarEventId as any },
      relations: { participants: true, createdBy: true } as any,
    });
    if (!event) return null;

    const channelId = meeting.channelId ?? meeting.channel?.id ?? null;

    const participantsPreview = await (async () => {
      if (channelId) {
        const channel = await this.channelRepo.findChannel(channelId, {
          peers: true,
        });
        return take(channel?.peers ?? [], 4).map((u: any) => ({
          id: u.id,
          name: u.name,
          picture: u.picture ?? null,
        }));
      }

      const uniqueUsers = uniqBy(
        compact([event.createdBy, ...(event.participants ?? [])]) as any[],
        'id',
      ).slice(0, 4);

      return uniqueUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        picture: u.picture ?? null,
      }));
    })();

    return {
      meeting,
      calendarEvent: event,
      participantsPreview,
    };
  }
}
