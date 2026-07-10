import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuePurgeService } from 'src/project/application/services/issue-purge.service';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class RemoveIssue {
  issueId: number;
  issuer: Issuer;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deleteSubIssues?: boolean;

  constructor(data: Partial<RemoveIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveIssue)
export class RemoveIssueCommand implements ICommandHandler<RemoveIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private issuePurge: IssuePurgeService,
  ) {}

  @Transactional()
  async execute({ issueId, issuer, deleteSubIssues }: RemoveIssue) {
    const root = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!root) throw new NotFoundException('Issue not found');
    if (!(await this.workspaceRepo.memberExists(root.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    if (deleteSubIssues) {
      const descendants = await this.issuePurge.collectDescendantsBottomUp(
        root.id,
      );
      for (const child of descendants) {
        await this.issuePurge.purgeIssue(child);
      }
    } else {
      await this.issueRepo.update(
        { parentIssueId: root.id },
        { parentIssueId: null },
      );
    }

    await this.issuePurge.purgeIssue(root);
  }
}
