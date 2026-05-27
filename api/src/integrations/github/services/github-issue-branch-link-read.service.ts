import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IGithubIssueBranchLink } from '@epicstory/contracts';
import { Repository } from 'typeorm';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssueGithubBranch } from '../entities';
import { mapIssueGithubBranchLinkRow } from './github-issue-branch-link.mapper';

@Injectable()
export class GithubIssueBranchLinkReadService {
  constructor(
    @InjectRepository(IssueGithubBranch)
    private readonly branchLinks: Repository<IssueGithubBranch>,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    private readonly workspaceRepo: WorkspaceRepository,
  ) {}

  async listForIssuer(
    issueId: number,
    issuerId: number,
  ): Promise<IGithubIssueBranchLink[]> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new ForbiddenException('Issue not found');
    }
    await this.workspaceRepo.requiresMembership(issue.workspaceId, issuerId);

    const rows = await this.branchLinks.find({
      where: { issueId },
      order: { lastPushedAt: 'DESC' },
    });
    return rows.map(mapIssueGithubBranchLinkRow);
  }
}
