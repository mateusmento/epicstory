import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

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
  ) {}

  async execute({ issuer, issueId, userId }: RemoveAssignee) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    await this.issueRepo.query(
      `DELETE FROM "${PROJECT_SCHEMA}"."issue_assignee" WHERE "issue_id" = $1 AND "user_id" = $2`,
      [issueId, userId],
    );

    const updated = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true },
    });
    if (!updated) throw new NotFoundException('Issue not found');

    return updated;
  }
}
