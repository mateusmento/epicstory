import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { concat, uniq } from 'lodash';
import { DataSource } from 'typeorm';
import { NotificationService } from 'src/notifications/services/notification.service';
import { CalendarEvent } from '../entities';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { CalendarEventReminderPayload } from '../types';
import { ScheduledJobWithPayload } from 'src/scheduling/types';

@Injectable()
export class CalendarEventReminderReaction {
  constructor(
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {}

  @OnEvent('scheduled-job.calendar.event-reminder', { async: true })
  async handle(job: ScheduledJobWithPayload<CalendarEventReminderPayload>) {
    const { calendarEventId } = job.payload;
    const occurrenceAt = job.occurrenceAt;

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const channelRepo = this.dataSource.getRepository(Channel);

    const event = await calendarRepo.findOne({
      where: { id: calendarEventId as any },
      relations: { participants: true },
    });
    if (!event) return;

    const channelId = event.payload.channelId;

    let channelMembers: number[] = [];
    if (channelId) {
      const channel = await channelRepo.findOne({
        where: { id: channelId as any },
        relations: { peers: true },
      });
      channelMembers = (channel?.peers ?? []).map((u) => u.id);
    }
    const participantIds = event.participants?.map((u) => u.id) ?? [];
    const recipientIds = uniq(
      concat(channelMembers, participantIds, [event.createdById]),
    );

    for (const userId of recipientIds) {
      await this.notificationService.sendNotification({
        type: 'calendar_event_reminder',
        userId,
        workspaceId: event.workspaceId,
        payload: {
          calendarEventId: event.id,
          occurrenceAt,
          title: event.title,
          channelId,
        },
      });
    }
  }
}
