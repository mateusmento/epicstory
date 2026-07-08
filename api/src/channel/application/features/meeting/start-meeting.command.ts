import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { isFuture } from 'date-fns';
import { Meeting } from 'src/channel/domain';
import { MeetingRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { MeetingNotFoundException } from '../../exceptions';
import type { MeetingGateway } from '../../gateways';
import { ChannelActivityService } from '../../services/channel-activity.service';

export class StartMeeting {
  @IsNumber()
  meetingId: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startedAt?: Date;

  @IsOptional()
  @IsNumber()
  organizerUserId?: number | null;

  constructor(data: Partial<StartMeeting> = {}) {
    patch(this, data);
  }
}

@CommandHandler(StartMeeting)
export class StartMeetingHandler implements ICommandHandler<StartMeeting> {
  constructor(
    private meetingRepo: MeetingRepository,
    @Inject('MeetingGateway') private meetingGateway: MeetingGateway,
    private channelActivityService: ChannelActivityService,
  ) {}

  async execute(command: StartMeeting): Promise<Meeting> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: command.meetingId },
      relations: { attendees: true },
    });
    if (!meeting) throw new MeetingNotFoundException();

    const startedAt = command.startedAt ?? new Date();

    if (isFuture(startedAt)) {
      throw new Error('Invalid startedAt: can not start meeting in the future');
    }

    if (!meeting.ongoing) {
      meeting.ongoing = true;
      meeting.startedAt = startedAt;
      await this.meetingRepo.save(meeting);
      this.meetingGateway.emitIncomingMeeting(meeting);
      if (meeting.channelId) {
        const { threadMessageId } =
          await this.channelActivityService.publishMeetingStarted({
            meetingId: meeting.id,
            actorId: null,
            organizerUserId: command.organizerUserId ?? null,
          });
        meeting.threadMessageId = threadMessageId;
      }
    }

    return meeting;
  }
}
