import type { IGithubIssuePullRequestLink } from '@epicstory/contracts';
import type { IssueGithubPullRequest } from '../entities/issue-github-pull-request.entity';

/** Shared wire mapping for persisted `IssueGithubPullRequest` rows (API + integrations). */
export function mapIssueGithubPullRequestRow(
  row: IssueGithubPullRequest,
): IGithubIssuePullRequestLink {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}
