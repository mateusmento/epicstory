import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IGithubIssuePullRequestLink } from '@epicstory/contracts';
import { Repository } from 'typeorm';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssueGithubPullRequest } from '../entities';

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

    return rows.map(toWire);
  }
}

function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

function toWire(row: IssueGithubPullRequest): IGithubIssuePullRequestLink {
  return {
    id: row.id,
    issueId: row.issueId,
    githubPullRequestId: row.githubPullRequestId,
    owner: row.owner,
    repoName: row.repoName,
    fullName: `${row.owner}/${row.repoName}`,
    prNumber: row.prNumber,
    htmlUrl: row.htmlUrl,
    headRef: row.headRef ?? null,
    baseRef: row.baseRef ?? null,
    state: row.state,
    draft: row.draft,
    merged: row.merged,
    mergedAt: iso(row.mergedAt ?? null),
    closedAt: iso(row.closedAt ?? null),
    githubUpdatedAt: iso(row.githubUpdatedAt ?? null),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
