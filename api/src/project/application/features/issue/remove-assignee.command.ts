import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { syncIssueDueDateReminders } from './sync-issue-due-reminders';

export class RemoveAssignee {
  issuer: Issuer;

  issueId: number;

  @IsNumber()
  userId: number;

  constructor(data: Partial<RemoveAssignee>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveAssignee)
export class RemoveAssigneeCommand implements ICommandHandler<RemoveAssignee> {
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private userRepo: UserRepository,
    private issueActivities: IssueActivityRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute({ issuer, issueId, userId }: RemoveAssignee) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const user = await this.userRepo.findOne({ where: { id: userId } });

    await this.issueRepo.query(
      `DELETE FROM "${PROJECT_SCHEMA}"."issue_assignee" WHERE "issue_id" = $1 AND "user_id" = $2`,
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
          addedUserIds: [],
          removedUserIds: [userId],
          ...(user ? { removedUserNames: [user.name] } : {}),
        },
      }),
    );

    const updated = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true, parentIssue: true, labels: true },
    });
    if (!updated) throw new NotFoundException('Issue not found');

    // Keep persisted due-date reminder jobs in sync with assignees.
    if (updated.dueDate) {
      await syncIssueDueDateReminders({
        scheduledJobRepo: this.scheduledJobRepo,
        issue: updated,
        issuerId: issuer.id,
      });
    }

    return updated;
  }
}
