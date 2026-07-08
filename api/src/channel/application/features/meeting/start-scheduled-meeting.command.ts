import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { addMilliseconds } from 'date-fns';
import { CalendarEvent } from 'src/calendar/entities';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import {
  ChannelRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { DataSource } from 'typeorm';
import { StartMeeting } from './start-meeting.command';

/**
 * Scheduled meeting = calendar-backed meeting occurrence.
 * Ensures the occurrence exists and then starts it (ongoing=true + startedAt + incoming-meeting).
 * If the calendar event has no channelId, auto-creates or links to an existing DM channel
 * based on the event's participants.
 */
export class StartScheduledMeeting {
  @IsString()
  calendarEventId: string;

  @Type(() => Date)
  @IsDate()
  occurrenceAt: Date; // occurrence start timestamp

  @IsNumber()
  workspaceId: number;

  constructor(data: Partial<StartScheduledMeeting> = {}) {
    patch(this, data);
  }
}

@CommandHandler(StartScheduledMeeting)
export class StartScheduledMeetingHandler
  implements ICommandHandler<StartScheduledMeeting>
{
  constructor(
    private dataSource: DataSource,
    private meetingRepo: MeetingRepository,
    private channelRepo: ChannelRepository,
    private commandBus: CommandBus,
  ) {}

  async execute(command: StartScheduledMeeting) {
    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const event = await calendarRepo.findOne({
      where: {
        id: command.calendarEventId as any,
        workspaceId: command.workspaceId,
        type: 'meeting',
      } as any,
      relations: { participants: true },
    });
    if (!event) return;

    let channelId: number | null = (event.payload as any)?.channelId ?? null;

    if (!channelId) {
      const participantIds = (event.participants ?? []).map((p) => p.id);
      if (!participantIds.length) {
        throw new BadRequestException(
          'Cannot start a scheduled meeting with no channel and no participants',
        );
      }
      channelId = await this.resolveOrCreateChannel(command.workspaceId, event);
      // Persist channelId on the payload for future occurrences.
      (event.payload as any).channelId = channelId;
      await calendarRepo.save(event);
    }

    const scheduledEndsAt = event.duration()
      ? addMilliseconds(command.occurrenceAt, event.duration())
      : null;

    let meeting = await this.meetingRepo.findScheduled(
      event.id,
      command.occurrenceAt,
    );

    if (!meeting) {
      const created = Meeting.create({
        workspaceId: event.workspaceId,
        channelId,
        calendarEventId: event.id as any,
        scheduledStartsAt: command.occurrenceAt,
        scheduledEndsAt,
      });
      created.ongoing = false;
      created.startedAt = command.occurrenceAt;
      meeting = await this.meetingRepo.save(created);
    } else if (!meeting.channelId && channelId) {
      meeting.channelId = channelId;
      meeting = await this.meetingRepo.save(meeting);
    }

    await this.commandBus.execute(
      new StartMeeting({
        meetingId: meeting.id,
        startedAt: command.occurrenceAt,
        organizerUserId: event.createdById,
      }),
    );
  }

  private async resolveOrCreateChannel(
    workspaceId: number,
    event: CalendarEvent,
  ): Promise<number> {
    const participants = event.participants ?? [];
    const participantIds = participants.map((p) => p.id);

    const channelType = participantIds.length === 2 ? 'direct' : 'multi-direct';
    const existing = await this.channelRepo.findByPeers(
      workspaceId,
      participantIds,
      channelType,
    );
    if (existing) return existing.id;

    const channel =
      participantIds.length === 2
        ? Channel.createDirect({ workspaceId, peers: participants })
        : Channel.createMultiDirect({ workspaceId, peers: participants });

    const saved = await this.channelRepo.save(channel);
    return saved.id;
  }
}
