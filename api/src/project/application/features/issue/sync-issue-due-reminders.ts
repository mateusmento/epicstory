import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledJob } from 'src/scheduling/entities';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { DueIssueReminderPayload } from 'src/scheduling/types/payload';
import type { Issue } from 'src/project/domain/entities';

export async function syncIssueDueDateReminders(args: {
  scheduledJobRepo: ScheduledJobRepository;
  issue: Pick<
    Issue,
    'id' | 'issueKey' | 'title' | 'projectId' | 'workspaceId' | 'dueDate'
  > & {
    assignees?: { id: number }[];
  };
  issuerId: number;
  /** Optional override for the title stored in the payload (e.g. when title is being updated). */
  titleOverride?: string;
}): Promise<void> {
  const { scheduledJobRepo, issue, issuerId, titleOverride } = args;

  // If no due date, remove any pending reminders.
  if (!issue.dueDate) {
    await scheduledJobRepo.deleteUnprocessedDueIssueRemindersForIssue({
      workspaceId: issue.workspaceId,
      issueId: issue.id,
    });
    return;
  }

  // Recreate pending reminders for the current assignee set.
  await scheduledJobRepo.deleteUnprocessedDueIssueRemindersForIssue({
    workspaceId: issue.workspaceId,
    issueId: issue.id,
  });

  const assigneeIds = (issue.assignees ?? []).map((a) => a.id).filter(Boolean);
  const recipients = assigneeIds.length > 0 ? assigneeIds : [issuerId];
  const title = titleOverride ?? issue.title;

  for (const userId of recipients) {
    const job = ScheduledJob.create({
      type: ScheduledJobTypes.due_issue_reminder,
      workspaceId: issue.workspaceId,
      notifyMinutesBefore: 0,
      recurrence: { frequency: 'once' },
      dueAt: issue.dueDate,
      payload: new DueIssueReminderPayload({
        userId,
        title,
        description: `Issue "${title}" is due`,
        issueId: issue.id,
        issueKey: issue.issueKey,
        projectId: issue.projectId,
        workspaceId: issue.workspaceId,
        dueDate: issue.dueDate,
      }),
    });
    await scheduledJobRepo.save(job);
  }
}
