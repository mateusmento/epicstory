import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  BacklogItemRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class RemoveIssue {
  issueId: number;
  issuer: Issuer;
  constructor(data: Partial<RemoveIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveIssue)
export class RemoveIssueCommand implements ICommandHandler<RemoveIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private backlogItemRepo: BacklogItemRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, issuer }: RemoveIssue) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');
    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    // Issues can exist with or without a backlog item. If a backlog item exists, remove it first
    // (some environments might not have FK ON DELETE CASCADE for backlog_item.issue_id).
    await this.backlogItemRepo.delete({ issueId });
    await this.issueRepo.delete({ id: issueId });
  }
}
