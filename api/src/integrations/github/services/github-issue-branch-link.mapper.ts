import type { IGithubIssueBranchLink } from '@epicstory/contracts';
import type { IssueGithubBranch } from '../entities';

function branchTreeUrl(
  owner: string,
  repoName: string,
  branchName: string,
): string {
  return `https://github.com/${owner}/${repoName}/tree/${encodeURIComponent(branchName)}`;
}

export function mapIssueGithubBranchLinkRow(
  row: IssueGithubBranch,
): IGithubIssueBranchLink {
  const owner = row.owner.trim();
  const repoName = row.repoName.trim();
  const branchName = row.branchName.trim();
  return {
    id: row.id,
    owner,
    repoName,
    branchName,
    fullName: `${owner}/${repoName}`,
    htmlUrl: branchTreeUrl(owner, repoName, branchName),
    source: row.source,
    firstLinkedAt: row.firstLinkedAt.toISOString(),
    lastPushedAt: row.lastPushedAt.toISOString(),
  };
}
