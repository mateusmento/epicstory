import { Injectable } from '@nestjs/common';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import {
  MeetingAttendeeRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import {
  MeetingHasntStartedException,
  MeetingNotFoundException,
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
    const meeting = this.meetingRepo.findOne({
      where: { channelId, ongoing: true },
      relations: { attendees: true },
    });
    if (!meeting) throw new MeetingHasntStartedException();
    return meeting;
  }

  save(meeting: Meeting) {
    return this.meetingRepo.save(meeting);
  }

  async startMeeting(channelId: number, attendee: MeetingAttendee) {
    const meeting = Meeting.ongoing(channelId);
    meeting.addAttendee(attendee);
    return await this.meetingRepo.save(meeting);
  }

  async joinMeeting(meeting: Meeting, attendee: MeetingAttendee) {
    if (!meeting || !meeting.ongoing) throw new MeetingHasntStartedException();
    meeting.addAttendee(attendee);
    return await this.meetingRepo.save(meeting);
  }

  async leaveMeeting(meetingId: number, remoteId: string) {
    await this.meetingAttendeeRepo.delete({ remoteId });
    return this.meetingAttendeeRepo.countBy({ meetingId });
  }

  async endMeeting(meetingId: number) {
    await this.meetingAttendeeRepo.delete({ meetingId });
    return this.meetingRepo.delete({ id: meetingId });
  }

  async updateAttendee(
    meetingId: number,
    remoteId: string,
    data: Partial<MeetingAttendee>,
  ) {
    return this.meetingAttendeeRepo.update({ meetingId, remoteId }, data);
  }
}
