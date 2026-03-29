import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';

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

    const ev = await calendarRepo.findOne({
      where: { id: query.calendarEventId as any },
      relations: { participants: true },
    });
    if (!ev) throw new BadRequestException('Calendar event not found');

    if (ev.type !== 'meeting') throw new BadRequestException('Not a meeting');

    const member = await this.workspaceRepo.findMember(
      ev.workspaceId,
      query.issuerId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    const channelId = ev.payload.channelId;

    if (channelId) {
      const channelRepo = this.dataSource.getRepository(Channel);
      const isChannelMember = await channelRepo
        .createQueryBuilder('channel')
        .innerJoin('channel.peers', 'peer', 'peer.id = :userId', {
          userId: query.issuerId,
        })
        .where('channel.id = :channelId', { channelId })
        .getExists();
      if (!isChannelMember)
        throw new ForbiddenException('Not a channel member');
    } else if (!ev.isPublic) {
      const isParticipant =
        ev.createdById === query.issuerId ||
        (ev.participants ?? []).some((u: any) => u.id === query.issuerId);
      if (!isParticipant) throw new ForbiddenException('Not a participant');
    }

    const meeting = await meetingRepo.findOne({
      where: {
        calendarEventId: ev.id as any,
        occurrenceStartsAt: query.occurrenceAt as any,
      } as any,
      relations: { attendees: { user: true } } as any,
    });

    return {
      calendarEvent: {
        id: ev.id,
        workspaceId: ev.workspaceId,
        channelId,
        title: ev.title,
        description: ev.description,
        isPublic: ev.isPublic,
        notifyMinutesBefore: ev.notifyMinutesBefore,
        participants: ev.participants ?? [],
      },
      occurrenceAt: query.occurrenceAt,
      meeting: meeting
        ? {
            id: meeting.id,
            ongoing: meeting.ongoing,
            startsAt: meeting.startsAt,
            endedAt: meeting.endedAt ?? null,
            attendees: (meeting.attendees ?? []).map((a: any) => ({
              id: a.id,
              user: a.user,
            })),
          }
        : null,
    };
  }
}
