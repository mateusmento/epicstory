import type { IGithubIssuePullRequestLink } from "@epicstory/contracts";

export type GithubPrStatusFilter = "all" | "open" | "merged" | "closed";

export type GithubPullRequestGroup = {
  fullName: string;
  pullRequests: IGithubIssuePullRequestLink[];
};

export function matchesGithubPrFilter(
  pr: IGithubIssuePullRequestLink,
  filter: GithubPrStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "merged") return pr.merged === true;
  if (filter === "closed") return pr.merged === false && pr.state === "closed";
  return pr.merged === false && pr.state === "open";
}

export function groupGithubPullRequests(
  pullRequests: IGithubIssuePullRequestLink[],
  filter: GithubPrStatusFilter,
): GithubPullRequestGroup[] {
  const filtered = pullRequests.filter((pr) => matchesGithubPrFilter(pr, filter));
  const byRepo = new Map<string, IGithubIssuePullRequestLink[]>();

  for (const pr of filtered) {
    const list = byRepo.get(pr.fullName);
    if (list) list.push(pr);
    else byRepo.set(pr.fullName, [pr]);
  }

  return [...byRepo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fullName, groupedPullRequests]) => ({
      fullName,
      pullRequests: groupedPullRequests.sort((x, y) => y.prNumber - x.prNumber),
    }));
}
