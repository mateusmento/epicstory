import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  DueIssueReminderPayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types';

@Injectable()
export class IssueDueDateReaction {
  constructor(private notificationService: NotificationService) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.due_issue_reminder}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<DueIssueReminderPayload>) {
    const userId = job.payload.userId;
    const workspaceId = job.workspaceId;
    if (!userId || !workspaceId) return;

    await this.notificationService.sendNotification({
      type: 'issue_due_date',
      userId,
      workspaceId,
      payload: {
        type: 'issue_due_date',
        ...job.payload,
      },
    });
  }
}
