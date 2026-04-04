import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsBoolean, IsString } from 'class-validator';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import {
  ChannelRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { ChannelNotFound } from '../../exceptions';
import { Inject } from '@nestjs/common';
import type { MeetingGateway } from '../../gateways';

export class JoinChannelMeeting {
  issuerId: number;

  channelId: number;

  @IsString()
  remoteId: string;
  @IsBoolean()
  isCameraOn: boolean;
  @IsBoolean()
  isMicrophoneOn: boolean;

  constructor(data: Partial<JoinChannelMeeting> = {}) {
    patch(this, data);
  }
}

@CommandHandler(JoinChannelMeeting)
export class JoinChannelMeetingHandler
  implements ICommandHandler<JoinChannelMeeting>
{
  constructor(
    private meetingRepo: MeetingRepository,
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    @Inject('MeetingGateway') private meetingGateway: MeetingGateway,
  ) {}

  @Transactional()
  async execute(command: JoinChannelMeeting): Promise<Meeting> {
    const { issuerId, channelId, remoteId, isCameraOn, isMicrophoneOn } =
      command;

    const channel = await this.channelRepo.findOneBy({ id: channelId });
    if (!channel) throw new ChannelNotFound();

    const { workspaceId } = channel;

    const member = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!member) throw new ChannelNotFound();

    let meeting = await this.meetingRepo.findOngoing(
      { channelId },
      { attendees: { user: true } },
    );

    if (!meeting) {
      meeting = Meeting.ongoing(channelId, workspaceId);
      meeting = await this.meetingRepo.save(meeting);
      this.meetingGateway.emitIncomingMeeting(meeting, issuerId);
    }

    const attendee = MeetingAttendee.of({
      remoteId,
      userId: issuerId,
      isCameraOn,
      isMicrophoneOn,
    });

    meeting.addAttendee(attendee);

    meeting = await this.meetingRepo.save(meeting);

    this.meetingGateway.emitAttendeeJoined(meeting, attendee);

    this.meetingGateway.joinMeetingRoom(issuerId, meeting.id, remoteId);

    return meeting;
  }
}
