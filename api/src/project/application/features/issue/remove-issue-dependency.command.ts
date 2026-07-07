import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueDependencyRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class RemoveIssueDependency {
  issueId: number;
  dependencyId: number;
  issuer: Issuer;

  constructor(data: Partial<RemoveIssueDependency> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveIssueDependency)
export class RemoveIssueDependencyCommand
  implements ICommandHandler<RemoveIssueDependency>
{
  constructor(
    private issueRepo: IssueRepository,
    private issueDependencyRepo: IssueDependencyRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, dependencyId, issuer }: RemoveIssueDependency) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const dependency = await this.issueDependencyRepo.findOne({
      where: { id: dependencyId, issueId },
    });
    if (!dependency) throw new NotFoundException('Dependency not found');

    await this.issueDependencyRepo.remove(dependency);
    return { success: true };
  }
}
