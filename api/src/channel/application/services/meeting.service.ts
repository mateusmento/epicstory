import { Injectable } from '@nestjs/common';
import { MeetingAttendee } from 'src/channel/domain';
import {
  MeetingAttendeeRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';

@Injectable()
export class MeetingService {
  constructor(
    private meetingRepo: MeetingRepository,
    private meetingAttendeeRepo: MeetingAttendeeRepository,
  ) {}

  async findMeeting({
    meetingId,
    channelId,
  }:
    | { meetingId: number; channelId?: never }
    | { channelId: number; meetingId?: never }) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId, channelId },
      relations: { attendees: true },
    });
    return meeting;
  }

  async leaveMeeting(meetingId: number, remoteId: string) {
    await this.meetingAttendeeRepo.delete({ remoteId });
    return this.meetingAttendeeRepo.countBy({ meetingId });
  }

  async endMeeting(meetingId: number) {
    await this.meetingAttendeeRepo.delete({ meetingId });
    return this.meetingRepo.update({ id: meetingId }, {
      ongoing: false,
      endedAt: new Date(),
    } as any);
  }

  async updateAttendee(
    meetingId: number,
    remoteId: string,
    data: Partial<MeetingAttendee>,
  ) {
    return this.meetingAttendeeRepo.update({ meetingId, remoteId }, data);
  }
}
