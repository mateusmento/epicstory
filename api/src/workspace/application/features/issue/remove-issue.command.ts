import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  IssueRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

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
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, issuer }: RemoveIssue) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');
    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();
    this.issueRepo.remove(issue);
  }
}
