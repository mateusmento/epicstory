import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { GithubIssueBranchService } from 'src/integrations/github/services/github-issue-branch.service';
import { IssueRepository } from 'src/project/infrastructure/repositories';

export class FindIssue {
  issueId: number;
  /** When set, probes GitHub for whether `githubBranch` still exists. */
  userId?: number;

  constructor(data: Partial<FindIssue> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssue)
export class FindIssueQuery implements IQueryHandler<FindIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private readonly githubIssueBranches: GithubIssueBranchService,
  ) {}

  async execute({ issueId, userId }: FindIssue) {
    const issue = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: {
        assignees: true,
        labels: true,
        parentIssue: true,
        project: true,
        subIssues: { assignees: true, labels: true },
      },
    });
    if (!issue) return issue;
    return this.githubIssueBranches.enrichIssueForResponse(issue, userId);
  }
}
