import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssueDependency } from 'src/project/domain/entities';
import { wouldCreateDependencyCycle } from 'src/project/domain/utils/issue-dependency-cycle';
import {
  IssueDependencyRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class CreateIssueDependency {
  issueId: number;
  issuer: Issuer;

  @IsNumber()
  dependsOnIssueId: number;

  constructor(data: Partial<CreateIssueDependency> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateIssueDependency)
export class CreateIssueDependencyCommand
  implements ICommandHandler<CreateIssueDependency>
{
  constructor(
    private issueRepo: IssueRepository,
    private issueDependencyRepo: IssueDependencyRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, issuer, dependsOnIssueId }: CreateIssueDependency) {
    if (issueId === dependsOnIssueId) {
      throw new BadRequestException('An issue cannot depend on itself');
    }

    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    const dependsOn = await this.issueRepo.findOne({
      where: { id: dependsOnIssueId },
    });
    if (!dependsOn) throw new NotFoundException('Depends-on issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    if (issue.workspaceId !== dependsOn.workspaceId) {
      throw new BadRequestException('Issues must belong to the same workspace');
    }

    if (issue.issueType !== 'epic' || dependsOn.issueType !== 'epic') {
      throw new BadRequestException(
        'Dependencies are only supported between epics',
      );
    }

    const existing = await this.issueDependencyRepo.findOne({
      where: { issueId, dependsOnIssueId },
    });
    if (existing) return existing;

    const workspaceEdges = await this.issueDependencyRepo.find({
      where: { workspaceId: issue.workspaceId },
      select: { issueId: true, dependsOnIssueId: true },
    });

    if (
      wouldCreateDependencyCycle(workspaceEdges, { issueId, dependsOnIssueId })
    ) {
      throw new BadRequestException('Dependency would create a cycle');
    }

    return this.issueDependencyRepo.save(
      IssueDependency.create({
        workspaceId: issue.workspaceId,
        issueId,
        dependsOnIssueId,
      }),
    );
  }
}
