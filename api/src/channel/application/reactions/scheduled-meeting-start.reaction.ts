import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  MeetingStartPayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types';
import { CommandBus } from '@nestjs/cqrs';
import { StartScheduledMeeting } from '../features/meeting/start-scheduled-meeting.command';

@Injectable()
export class ScheduledMeetingStartReaction {
  constructor(private commandBus: CommandBus) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.meeting_start}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<MeetingStartPayload>) {
    const { calendarEventId } = job.payload;
    const occurrenceStartsAt = job.occurrenceAt;
    if (!occurrenceStartsAt) return;

    await this.commandBus.execute(
      new StartScheduledMeeting({
        calendarEventId,
        occurrenceAt: occurrenceStartsAt,
        workspaceId: job.workspaceId,
      }),
    );
  }
}
