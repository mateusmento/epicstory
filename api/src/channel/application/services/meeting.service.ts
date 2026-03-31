import { Injectable } from '@nestjs/common';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import {
  ChannelRepository,
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
    private channelRepo: ChannelRepository,
  ) {}

  async findMeeting(id: number) {
    const meeting = await this.meetingRepo.findOne({
      where: { id },
      relations: { attendees: true },
    });
    if (!meeting) throw new MeetingNotFoundException();
    return meeting;
  }

  async findOngoingMeeting(channelId: number) {
    const meeting = await this.meetingRepo.findOne({
      where: { channel: { id: channelId }, ongoing: true } as any,
      relations: { attendees: true },
    });
    if (!meeting) throw new MeetingHasntStartedException();
    return meeting;
  }

  save(meeting: Meeting) {
    return this.meetingRepo.save(meeting);
  }

  async startMeeting(channelId: number, attendee?: MeetingAttendee) {
    const channel = await this.channelRepo.findChannel(channelId);
    if (!channel) throw new Error('Channel not found');
    const meeting = Meeting.ongoing(channelId, channel.workspaceId);
    meeting.channel = channel as any;
    if (attendee) meeting.addAttendee(attendee);
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
