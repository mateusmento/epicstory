import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ChannelRepository } from 'src/channel/infrastructure';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories';
import { MeetingGateway } from '../gateways/meeting.gateway';
import { MeetingService } from './meeting.service';

@Injectable()
export class MeetingKickService {
  constructor(
    private meetingService: MeetingService,
    private channelRepo: ChannelRepository,
    private workspaceMemberRepo: WorkspaceMemberRepository,
    @Inject(forwardRef(() => MeetingGateway))
    private meetingGateway: MeetingGateway,
  ) {}

  /** Remove one attendee from a meeting; end the meeting when the room empties (unless persistent). */
  async removeAttendee(params: {
    meetingId: number;
    remoteId: string;
    userId: number;
  }): Promise<void> {
    const { meetingId, remoteId, userId } = params;

    const meeting = await this.meetingService.findMeeting({ meetingId });
    if (!meeting) {
      await this.meetingService.leaveMeeting(meetingId, remoteId);
      return;
    }

    const channelId = meeting.channelId;
    const channel =
      channelId != null
        ? await this.channelRepo.findOneBy({ id: channelId })
        : null;
    const isPersistentMeetingChannel = channel?.type === 'meeting';

    const attendeesCount = await this.meetingService.leaveMeeting(
      meetingId,
      remoteId,
    );

    this.meetingGateway.emitAttendeeLeft({
      meetingId,
      remoteId,
      channelId: channelId ?? undefined,
      userId,
    });

    if (attendeesCount <= 0 && !isPersistentMeetingChannel) {
      await this.meetingService.endMeeting(meetingId);
      await this.meetingGateway.emitMeetingEnded(meeting);
      this.meetingGateway.clearMeetingRoom(meetingId);
    }
  }

  /** Force-remove a user from every live meeting and disconnect their sockets. */
  async forceLeaveAndDisconnectUser(userId: number): Promise<void> {
    const attendees = await this.meetingService.findAttendeesByUserId(userId);
    for (const attendee of attendees) {
      try {
        await this.removeAttendee({
          meetingId: attendee.meetingId,
          remoteId: attendee.remoteId,
          userId,
        });
      } catch (ex) {
        console.log('WARNING: force leave meeting failed', ex);
      }
    }

    await this.meetingGateway.disconnectUser(userId);
  }

  /** Drain all live meetings in a workspace and disconnect every member. */
  async forceLeaveAndDisconnectWorkspace(workspaceId: number): Promise<void> {
    const meetings =
      await this.meetingService.findOngoingMeetingsByWorkspace(workspaceId);

    for (const meeting of meetings) {
      const attendees = meeting.attendees ?? [];
      for (const attendee of attendees) {
        try {
          await this.removeAttendee({
            meetingId: meeting.id,
            remoteId: attendee.remoteId,
            userId: attendee.userId,
          });
        } catch (ex) {
          console.log('WARNING: workspace meeting kick failed', ex);
        }
      }
      try {
        await this.meetingService.endMeeting(meeting.id);
        await this.meetingGateway.emitMeetingEnded(meeting);
        this.meetingGateway.clearMeetingRoom(meeting.id);
      } catch (ex) {
        console.log('WARNING: end workspace meeting failed', ex);
      }
    }

    const members = await this.workspaceMemberRepo.find({
      where: { workspaceId },
      select: { userId: true },
    });
    for (const member of members) {
      try {
        await this.meetingGateway.disconnectUser(member.userId);
      } catch (ex) {
        console.log('WARNING: disconnect workspace member failed', ex);
      }
    }
  }
}
