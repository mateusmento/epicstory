import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { DataSource } from 'typeorm';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { CalendarEventRepository } from '../repositories';
import { MeetingRepository } from 'src/channel/infrastructure';

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
    const ev = await this.calendarRepo.findOne({
      where: { id: command.calendarEventId as any },
      relations: { participants: true },
    });
    if (!ev) throw new BadRequestException('Calendar event not found');
    if (ev.type !== 'meeting') throw new BadRequestException('Not a meeting');

    const member = await this.workspaceRepo.findMember(
      ev.workspaceId,
      command.issuerId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    const channelId = ev.payload.channelId;

    if (channelId) {
      const channelRepo = this.dataSource.getRepository(Channel);
      const isChannelMember = await channelRepo
        .createQueryBuilder('channel')
        .innerJoin('channel.peers', 'peer', 'peer.id = :userId', {
          userId: command.issuerId,
        })
        .where('channel.id = :channelId', { channelId })
        .getExists();
      if (!isChannelMember)
        throw new ForbiddenException('Not a channel member');
    } else if (!ev.isPublic) {
      const isParticipant =
        ev.createdById === command.issuerId ||
        (ev.participants ?? []).some((u: any) => u.id === command.issuerId);
      if (!isParticipant) throw new ForbiddenException('Not a participant');
    }

    const occurrenceAt = command.occurrenceAt;

    let meeting = await this.meetingRepo.findMeeting(ev.id, occurrenceAt);

    if (!meeting) {
      meeting = await this.meetingRepo.save(
        Meeting.scheduledFromCalendar({
          workspaceId: ev.workspaceId,
          calendarEventId: ev.id as any,
          occurrenceStartsAt: occurrenceAt,
          channelId,
        }),
      );
    }

    return { meetingId: meeting.id };
  }
}
