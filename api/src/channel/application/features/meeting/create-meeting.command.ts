import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsUUID,
  Validate,
} from 'class-validator';
import { UUID } from 'crypto';
import { isDate, isFuture } from 'date-fns';
import { Meeting } from 'src/channel/domain';
import {
  ChannelRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound } from '../../exceptions';
import type { MeetingGateway } from '../../gateways';

export class CreateMeeting {
  issuerId: number;

  workspaceId: number;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsOptional()
  @IsUUID()
  calendarEventId?: UUID;

  @IsOptional()
  @IsDate()
  @Validate((value) => isDate(value) && isFuture(value), {
    message: 'scheduledStartsAt must be in the future',
  })
  scheduledStartsAt?: Date;

  @IsOptional()
  @IsDate()
  @Validate((value) => isDate(value) && isFuture(value), {
    message: 'scheduledEndsAt must be in the future',
  })
  scheduledEndsAt?: Date;

  constructor(data: Partial<CreateMeeting> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateMeeting)
export class CreateMeetingHandler implements ICommandHandler<CreateMeeting> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private meetingRepo: MeetingRepository,
    private channelRepo: ChannelRepository,
    @Inject('MeetingGateway') private meetingGateway: MeetingGateway,
  ) {}

  async execute({
    channelId,
    workspaceId,
    issuerId,
    ...command
  }: CreateMeeting) {
    await this.workspaceRepo.requiresMembership(workspaceId, issuerId);

    let meeting = Meeting.create({ ...command, channelId, workspaceId });

    if (channelId && meeting.ongoing) {
      const channel = await this.channelRepo.findBy({
        id: channelId,
        workspaceId,
      });

      if (!channel) throw new ChannelNotFound();

      const existing = await this.meetingRepo.findOngoing({ channelId });

      if (existing) return existing;
    }

    meeting = await this.meetingRepo.save(meeting);

    if (meeting.ongoing) this.meetingGateway.emitIncomingMeeting(meeting);

    meeting = await this.meetingRepo.findOne({
      where: { id: meeting.id },
      relations: { attendees: true },
    });

    return meeting;
  }
}
