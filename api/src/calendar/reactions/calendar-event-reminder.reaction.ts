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
import {
  addMilliseconds,
  addMinutes,
  differenceInMilliseconds,
} from 'date-fns';

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
    const reminderAt = job.occurrenceAt;
    if (!reminderAt) return;
    const notifyMinutesBefore = Math.max(0, job.notifyMinutesBefore ?? 0);
    const occurrenceStartsAt = addMinutes(reminderAt, notifyMinutesBefore);

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);

    const event = await calendarRepo.findOne({
      where: { id: calendarEventId },
      relations: { participants: true },
    });
    if (!event) return;

    const durationMs = Math.max(
      0,
      differenceInMilliseconds(event.endsAt, event.startsAt),
    );
    const occurrenceEndsAt = addMilliseconds(occurrenceStartsAt, durationMs);
    const channelId =
      (event.payload as { channelId?: number | null })?.channelId ?? null;

    const participantIds = event.participants?.map((u) => u.id) ?? [];
    const recipientIds = uniq(concat(participantIds, [event.createdById]));

    for (const userId of recipientIds) {
      await this.notificationService.sendNotification({
        type: 'calendar_event_reminder',
        userId,
        workspaceId: event.workspaceId,
        payload: {
          calendarEventId: event.id,
          occurrenceAt: occurrenceStartsAt,
          title: event.title,
          description: event.description ?? '',
          notifyMinutesBefore,
          calendarEventType: event.type,
          startsAt: occurrenceStartsAt,
          endsAt: occurrenceEndsAt,
          isPublic: event.isPublic,
          notifyEnabled: event.notifyEnabled,
          channelId,
          eventPayload: event.payload,
        },
      });
    }
  }
}
