import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

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
  ) {}

  async execute({ issuer, issueId, userId }: AddAssignee) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Idempotent insert (prevents duplicate PK errors on (issue_id, user_id))
    await this.issueRepo.query(
      `INSERT INTO "${PROJECT_SCHEMA}"."issue_assignee" ("issue_id", "user_id")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [issueId, userId],
    );

    const updated = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true },
    });
    // Should exist since we just found it, but keep a defensive check
    if (!updated) throw new NotFoundException('Issue not found');
    return updated;
  }
}
