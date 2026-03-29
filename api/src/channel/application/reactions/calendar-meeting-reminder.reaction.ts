import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { concat, uniq } from 'lodash';
import { CalendarEvent } from 'src/calendar/entities';
import { CalendarMeetingReminderPayload } from 'src/calendar/types';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import {
  ChannelRepository,
  MeetingRepository,
} from 'src/channel/infrastructure';
import { NotificationService } from 'src/notifications/services/notification.service';
import { ScheduledJobWithPayload } from 'src/scheduling/types';
import { DataSource } from 'typeorm';

@Injectable()
export class CalendarMeetingReminderReaction {
  constructor(
    private notificationService: NotificationService,
    private meetingRepo: MeetingRepository,
    private channelRepo: ChannelRepository,
    private dataSource: DataSource,
  ) {}

  @OnEvent('scheduled-job.calendar.meeting-reminder', { async: true })
  async handle(job: ScheduledJobWithPayload<CalendarMeetingReminderPayload>) {
    const { calendarEventId } = job.payload;
    const occurrenceAt = job.occurrenceAt;

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);

    const event = await calendarRepo.findOne({
      where: { id: calendarEventId },
      relations: { participants: true },
    });
    if (!event) return;

    const channelId = event.payload.channelId;

    // Determine recipients:
    // - Channel meeting: notify channel members
    // - Standalone meeting: notify participants
    let channelMembers: number[] = [];
    if (channelId) {
      const channel = await this.channelRepo.findChannel(channelId, {
        peers: true,
      });
      if (channel) channelMembers = channel.peers.map((u) => u.id);
    }
    const participantIds = event.participants?.map((u) => u.id) ?? [];
    const recipientIds = uniq(
      concat(channelMembers, participantIds, [event.createdById]),
    );

    // Ensure meeting session exists (idempotent via unique constraint).
    let meeting = await this.meetingRepo.findMeeting(event.id, occurrenceAt);

    if (!meeting) {
      meeting = await this.meetingRepo.save(
        Meeting.scheduledFromCalendar({
          workspaceId: event.workspaceId,
          calendarEventId: event.id,
          occurrenceStartsAt: occurrenceAt,
          channelId,
        }),
      );
    }

    for (const userId of recipientIds) {
      await this.notificationService.sendNotification({
        type: 'calendar_meeting_reminder',
        userId,
        workspaceId: event.workspaceId,
        payload: {
          calendarEventId: event.id,
          occurrenceAt,
          meetingId: meeting.id,
          title: event.title,
          channelId,
        },
      });
    }
  }
}
