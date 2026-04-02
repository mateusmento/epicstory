import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsBoolean, IsString } from 'class-validator';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import { MeetingRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { MeetingNotFoundException } from '../../exceptions';
import { Inject } from '@nestjs/common';
import type { MeetingGateway } from '../../gateways';

export class JoinMeeting {
  issuerId: number;

  meetingId: number;

  @IsString()
  remoteId: string;
  @IsBoolean()
  isCameraOn: boolean;
  @IsBoolean()
  isMicrophoneOn: boolean;

  constructor(data: Partial<JoinMeeting> = {}) {
    patch(this, data);
  }
}

@CommandHandler(JoinMeeting)
export class JoinMeetingHandler implements ICommandHandler<JoinMeeting> {
  constructor(
    private meetingRepo: MeetingRepository,
    private workspaceRepo: WorkspaceRepository,
    @Inject('MeetingGateway') private meetingGateway: MeetingGateway,
  ) {}

  @Transactional()
  async execute(command: JoinMeeting): Promise<Meeting> {
    const { issuerId, meetingId, remoteId, isCameraOn, isMicrophoneOn } =
      command;

    let meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: { attendees: true },
    });

    if (!meeting) throw new MeetingNotFoundException();

    const member = await this.workspaceRepo.findMember(
      meeting.workspaceId,
      issuerId,
    );

    if (!member) throw new MeetingNotFoundException();

    const attendee = MeetingAttendee.of({
      remoteId,
      userId: issuerId,
      isCameraOn,
      isMicrophoneOn,
    });

    const attendeeExists = meeting.attendees.find(
      (a) => a.remoteId === remoteId || a.userId === issuerId,
    );

    if (!attendeeExists) {
      meeting.addAttendee(attendee);
      meeting = await this.meetingRepo.save(meeting);
    }

    if (attendeeExists) {
    } else {
      this.meetingGateway.emitAttendeeJoined(meeting, attendee);
    }

    this.meetingGateway.joinMeetingRoom(issuerId, meeting.id, remoteId);

    return meeting;
  }
}
