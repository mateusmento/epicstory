import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IGithubIssuePullRequestLink } from '@epicstory/contracts';
import { Repository } from 'typeorm';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssueGithubPullRequest } from '../entities';
import { mapIssueGithubPullRequestRow } from './github-issue-pull-request.mapper';

@Injectable()
export class GithubIssuePullRequestReadService {
  constructor(
    @InjectRepository(IssueGithubPullRequest)
    private readonly prLinkRepo: Repository<IssueGithubPullRequest>,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    private readonly workspaceRepo: WorkspaceRepository,
  ) {}

  async listForIssuer(
    issueId: number,
    issuerId: number,
  ): Promise<IGithubIssuePullRequestLink[]> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new ForbiddenException('Issue not found');
    }
    await this.workspaceRepo.requiresMembership(issue.workspaceId, issuerId);

    const rows = await this.prLinkRepo.find({
      where: { issueId },
      order: { updatedAt: 'DESC' },
    });

    return rows.map(mapIssueGithubPullRequestRow);
  }
}
