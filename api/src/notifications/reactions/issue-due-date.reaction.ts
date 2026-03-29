import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class IssueDueDateReaction {
  constructor(private notificationService: NotificationService) {}

  @OnEvent('scheduled-job.issue.due-date', { async: true })
  async handle(job: any) {
    const userId = job?.payload?.userId as number | undefined;
    const workspaceId = job?.workspaceId as number | undefined;
    if (!userId || !workspaceId) return;

    await this.notificationService.sendNotification({
      type: 'issue_due_date',
      userId,
      workspaceId,
      payload: {
        type: 'issue_due_date',
        title: job?.payload?.title,
        description: job?.payload?.description,
        issueId: job?.payload?.issueId,
        projectId: job?.payload?.projectId,
      },
    });
  }
}
