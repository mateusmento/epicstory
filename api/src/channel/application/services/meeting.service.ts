import { Injectable } from '@nestjs/common';
import { Meeting } from 'src/channel/domain';
import {
  MeetingAttendeeRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import {
  MeetingHasntStartedException,
  MeetingNotFoundException,
  MeetingOngoingException,
} from '../exceptions';

@Injectable()
export class MeetingService {
  constructor(
    private meetingRepo: MeetingRepository,
    private meetingAttendeeRepo: MeetingAttendeeRepository,
  ) {}

  async findMeeting(id: number) {
    const meeting = await this.meetingRepo.findOneBy({ id });
    if (!meeting) throw new MeetingNotFoundException();
    return meeting;
  }

  findOngoingMeeting(channelId: number) {
    return this.meetingRepo.findOne({
      where: { channelId, ongoing: true },
      relations: { attendees: true },
    });
  }

  save(meeting: Meeting) {
    return this.meetingRepo.save(meeting);
  }

  async startMeeting(channelId: number) {
    const meeting = await this.meetingRepo.findOneBy({ channelId });
    if (meeting) throw new MeetingOngoingException();
    const ongoingMeeting = Meeting.ongoing(channelId);
    return await this.meetingRepo.save(ongoingMeeting);
  }

  async joinMeeting(meetingId: number, remoteId: string, userId: number) {
    const ongoingMeeting = await this.meetingRepo.findOne({
      where: { id: meetingId, ongoing: true },
      relations: { attendees: true },
    });
    if (!ongoingMeeting) throw new MeetingHasntStartedException();
    ongoingMeeting.addAttendee(remoteId, userId);
    return await this.meetingRepo.save(ongoingMeeting);
  }

  async leaveMeeting(meetingId: number, remoteId: string) {
    await this.meetingAttendeeRepo.delete({ remoteId });
    return this.meetingAttendeeRepo.countBy({ meetingId });
  }

  async endMeeting(meetingId: number) {
    await this.meetingAttendeeRepo.delete({ meetingId });
    return this.meetingRepo.delete({ id: meetingId });
  }
}
