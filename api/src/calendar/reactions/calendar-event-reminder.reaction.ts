import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { concat, uniq } from 'lodash';
import { NotificationService } from 'src/notifications/services/notification.service';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  CalendarEventReminderPayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';

@Injectable()
export class CalendarEventReminderReaction {
  constructor(
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.calendar_event_reminder}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<CalendarEventReminderPayload>) {
    const { calendarEventId } = job.payload;
    const occurrenceAt = job.occurrenceAt;

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);

    const event = await calendarRepo.findOne({
      where: { id: calendarEventId as any },
      relations: { participants: true },
    });
    if (!event) return;

    const participantIds = event.participants?.map((u) => u.id) ?? [];
    const recipientIds = uniq(concat(participantIds, [event.createdById]));

    for (const userId of recipientIds) {
      await this.notificationService.sendNotification({
        type: 'calendar_event_reminder',
        userId,
        workspaceId: event.workspaceId,
        payload: {
          calendarEventId: event.id,
          occurrenceAt,
          title: event.title,
        },
      });
    }
  }
}
