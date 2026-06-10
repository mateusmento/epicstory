import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { NotificationService } from 'src/notifications/services';
import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { excerptFromTiptapDocWithWorkspaceMembers } from 'src/utils/tiptap-excerpt';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { syncIssueDueDateReminders } from './sync-issue-due-reminders';

export class AddAssignee {
  issuer: Issuer;

  issueId: number;

  @IsNumber()
  userId: number;

  constructor(data: Partial<AddAssignee>) {
    patch(this, data);
  }
}

@CommandHandler(AddAssignee)
export class AddAssigneeCommand implements ICommandHandler<AddAssignee> {
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private userRepo: UserRepository,
    private issueActivities: IssueActivityRepository,
    private scheduledJobRepo: ScheduledJobRepository,
    private notificationService: NotificationService,
  ) {}

  async execute({ issuer, issueId, userId }: AddAssignee) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const issuerUser = await this.userRepo.findOne({
      where: { id: issuer.id },
    });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Idempotent insert (prevents duplicate PK errors on (issue_id, user_id))
    await this.issueRepo.query(
      `INSERT INTO "${PROJECT_SCHEMA}"."issue_assignee" ("issue_id", "user_id")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [issueId, userId],
    );

    await this.issueActivities.save(
      this.issueActivities.create({
        issueId,
        actorId: issuer.id,
        type: 'assignees_changed',
        messageId: null,
        attachmentId: null,
        payload: {
          addedUserIds: [userId],
          removedUserIds: [],
          addedUserNames: [user.name],
        },
      }),
    );

    const updated = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true, parentIssue: true, labels: true },
    });
    // Should exist since we just found it, but keep a defensive check
    if (!updated) throw new NotFoundException('Issue not found');

    // Keep persisted due-date reminder jobs in sync with assignees.
    if (updated.dueDate) {
      await syncIssueDueDateReminders({
        scheduledJobRepo: this.scheduledJobRepo,
        issue: updated,
        issuerId: issuer.id,
      });
    }

    if (userId !== issuer.id) {
      await this.notificationService.sendNotification({
        userId,
        type: 'issue_assigned',
        workspaceId: issue.workspaceId,
        payload: {
          issueId: updated.id,
          issueKey: updated.issueKey,
          projectId: updated.projectId,
          title: updated.title,
          description: await excerptFromTiptapDocWithWorkspaceMembers(
            this.workspaceRepo,
            issue.workspaceId,
            updated.description,
          ),
          issuer: issuerUser ?? issuer,
        },
      });
    }

    return updated;
  }
}
