import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { compact, take, uniqBy } from 'lodash';
import { CalendarEvent } from 'src/calendar/entities';
import { Meeting } from 'src/channel/domain';
import { patch } from 'src/core/objects';
import { logQuery } from 'src/core/typeorm/logging';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { DataSource } from 'typeorm';
import {
  ChannelRepository,
  MeetingRepository,
} from '../../infrastructure/repositories';

export type LiveScheduledMeetingDto = {
  meeting: Meeting;
  calendarEvent: CalendarEvent;
  participantsPreview: Array<{
    id: number;
    name: string;
    picture?: string | null;
  }>;
};

export class FindLiveMeeting {
  @IsNumber()
  workspaceId: number;

  @IsNumber()
  issuerId: number;

  now?: Date;

  constructor(data: Partial<FindLiveMeeting>) {
    patch(this, data);
  }
}

@QueryHandler(FindLiveMeeting)
export class FindLiveMeetingHandler implements IQueryHandler<FindLiveMeeting> {
  constructor(
    private meetingRepo: MeetingRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private dataSource: DataSource,
  ) {}

  async execute(
    query: FindLiveMeeting,
  ): Promise<LiveScheduledMeetingDto | null> {
    const { workspaceId, issuerId } = query;
    const now = query.now ?? new Date();

    await this.workspaceRepo.requiresMembership(workspaceId, issuerId);

    const qb = await this.meetingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect(CalendarEvent, 'ev', 'ev.id = m.calendar_event_id')
      .leftJoin('m.channel', 'ch')
      .andWhere('m.ongoing')
      .andWhere('m.endedAt IS NULL')
      .andWhere('(m.channel IS NULL or ch.type != :type)', { type: 'meeting' })
      .andWhere('m.workspaceId = :workspaceId', { workspaceId })
      .andWhere('m.startedAt <= :now', { now })
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
            m.calendar_event_id IS NOT NULL
            AND (
              ev.created_by_id = :userId
              OR EXISTS (
                SELECT 1
                FROM calendar.calendar_event_participants cep
                WHERE cep.calendar_event_id = m.calendar_event_id
                  AND cep.user_id = :userId
              )
            )
          )
          OR
          (m.channel_id IS NULL AND m.calendar_event_id IS NULL)
        )`,
        { userId: query.issuerId },
      )
      .orderBy('m.startedAt', 'ASC');

    logQuery(qb);

    const meeting = await qb.getOne();

    if (!meeting) return null;

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const event = meeting.calendarEventId
      ? await calendarRepo.findOne({
          where: { id: meeting.calendarEventId },
          relations: { participants: true, createdBy: true } as any,
        })
      : null;

    const channelId = meeting.channelId;

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

      if (event) {
        const uniqueUsers = uniqBy(
          compact([event.createdBy, ...(event.participants ?? [])]) as any[],
          'id',
        ).slice(0, 4);

        uniqueUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          picture: u.picture ?? null,
        }));
      }

      return [];
    })();

    return {
      meeting,
      calendarEvent: event,
      participantsPreview,
    };
  }
}
