import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsBoolean, IsString } from 'class-validator';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import { MeetingRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import {
  MeetingHasEndedException,
  MeetingNotFoundException,
} from '../../exceptions';
import type { MeetingGateway } from '../../gateways';
import { StartMeeting } from './start-meeting.command';

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
    private commandBus: CommandBus,
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
      relations: { attendees: { user: true } },
    });

    if (!meeting) throw new MeetingNotFoundException();

    const member = await this.workspaceRepo.findMember(
      meeting.workspaceId,
      issuerId,
    );

    if (!member) throw new MeetingNotFoundException();

    if (meeting.hasEnded()) {
      throw new MeetingHasEndedException();
    }

    if (meeting.isEmpty()) {
      this.commandBus.execute(new StartMeeting({ meetingId }));
    }

    const attendee = MeetingAttendee.of({
      remoteId,
      userId: issuerId,
      isCameraOn,
      isMicrophoneOn,
    });

    const attendeeExists = meeting.attendees.some(
      (a) => a.remoteId === remoteId || a.userId === issuerId,
    );

    if (!attendeeExists) {
      meeting.addAttendee(attendee);
      meeting = await this.meetingRepo.save(meeting);
      this.meetingGateway.emitAttendeeJoined(meeting, attendee);
    }

    this.meetingGateway.joinMeetingRoom(issuerId, meeting.id, remoteId);

    return meeting;
  }
}
