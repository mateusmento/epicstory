import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  MeetingReminderPayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types';
import { CommandBus } from '@nestjs/cqrs';
import { SendScheduledMeetingReminder } from '../features/meeting/send-scheduled-meeting-reminder.command';

@Injectable()
export class ScheduledMeetingReminderReaction {
  constructor(private commandBus: CommandBus) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.meeting_reminder}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<MeetingReminderPayload>) {
    const reminderAt = job.occurrenceAt;
    if (!reminderAt) return;
    await this.commandBus.execute(
      new SendScheduledMeetingReminder({
        calendarEventId: job.payload.calendarEventId as any,
        reminderAt,
        notifyMinutesBefore: job.notifyMinutesBefore ?? 0,
      }),
    );
  }
}
