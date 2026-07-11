import type { IGithubIssueBranchLink, IGithubIssuePullRequestLink } from "@epicstory/contracts";
import { matchesGithubPrFilter, type GithubPrStatusFilter } from "./group-issue-pull-requests";

export type IssueDevelopmentPrItem = {
  kind: "pr";
  id: string;
  fullName: string;
  htmlUrl: string;
  prNumber: number;
  headRef: string | null;
  statusLabel: "open" | "draft" | "merged" | "closed";
  pullRequest: IGithubIssuePullRequestLink;
};

export type IssueDevelopmentBranchItem = {
  kind: "branch";
  id: string;
  fullName: string;
  htmlUrl: string;
  branchName: string;
  owner: string;
  repoName: string;
  branch: IGithubIssueBranchLink;
};

export type IssueDevelopmentItem = IssueDevelopmentPrItem | IssueDevelopmentBranchItem;

export type IssueDevelopmentGroup = {
  fullName: string;
  items: IssueDevelopmentItem[];
};

function branchKey(fullName: string, branchName: string): string {
  return `${fullName}\0${branchName}`;
}

function prStatusLabel(pr: IGithubIssuePullRequestLink): IssueDevelopmentPrItem["statusLabel"] {
  if (pr.merged) return "merged";
  if (pr.state === "closed") return "closed";
  if (pr.draft) return "draft";
  return "open";
}

function toPrItem(pr: IGithubIssuePullRequestLink): IssueDevelopmentPrItem {
  return {
    kind: "pr",
    id: `pr:${pr.githubPullRequestId}`,
    fullName: pr.fullName,
    htmlUrl: pr.htmlUrl,
    prNumber: pr.prNumber,
    headRef: pr.headRef,
    statusLabel: prStatusLabel(pr),
    pullRequest: pr,
  };
}

function toBranchItem(branch: IGithubIssueBranchLink): IssueDevelopmentBranchItem {
  return {
    kind: "branch",
    id: `branch:${branch.id}`,
    fullName: branch.fullName,
    htmlUrl: branch.htmlUrl,
    branchName: branch.branchName,
    owner: branch.owner,
    repoName: branch.repoName,
    branch,
  };
}

function sortItems(items: IssueDevelopmentItem[]): IssueDevelopmentItem[] {
  return [...items].sort((a, b) => {
    if (a.kind === "pr" && b.kind === "pr") return b.prNumber - a.prNumber;
    if (a.kind === "pr") return -1;
    if (b.kind === "pr") return 1;
    return a.branchName.localeCompare(b.branchName);
  });
}

/**
 * Join linked branches + PRs into one list, then filter and group by repo.
 * Branch rows appear for `open` / `all` when no PR in the filtered set matches the head.
 */
export function buildIssueDevelopmentItems(
  branches: IGithubIssueBranchLink[],
  pullRequests: IGithubIssuePullRequestLink[],
  filter: GithubPrStatusFilter,
): IssueDevelopmentItem[] {
  const filteredPrs = pullRequests.filter((pr) => matchesGithubPrFilter(pr, filter));
  const prsByHead = new Map<string, IGithubIssuePullRequestLink[]>();

  for (const pr of filteredPrs) {
    if (!pr.headRef) continue;
    const key = branchKey(pr.fullName, pr.headRef);
    const list = prsByHead.get(key);
    if (list) list.push(pr);
    else prsByHead.set(key, [pr]);
  }

  const items: IssueDevelopmentItem[] = [];
  const usedPrIds = new Set<number>();
  const showBranches = filter === "open" || filter === "all";

  for (const branch of branches) {
    const key = branchKey(branch.fullName, branch.branchName);
    const matched = prsByHead.get(key) ?? [];
    if (matched.length > 0) {
      for (const pr of matched) {
        items.push(toPrItem(pr));
        usedPrIds.add(pr.id);
      }
      continue;
    }
    if (showBranches) items.push(toBranchItem(branch));
  }

  for (const pr of filteredPrs) {
    if (usedPrIds.has(pr.id)) continue;
    items.push(toPrItem(pr));
  }

  return sortItems(items);
}

export function groupIssueDevelopmentItems(
  branches: IGithubIssueBranchLink[],
  pullRequests: IGithubIssuePullRequestLink[],
  filter: GithubPrStatusFilter,
): IssueDevelopmentGroup[] {
  const items = buildIssueDevelopmentItems(branches, pullRequests, filter);
  const byRepo = new Map<string, IssueDevelopmentItem[]>();

  for (const item of items) {
    const list = byRepo.get(item.fullName);
    if (list) list.push(item);
    else byRepo.set(item.fullName, [item]);
  }

  return [...byRepo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fullName, groupItems]) => ({
      fullName,
      items: sortItems(groupItems),
    }));
}

export function countIssueDevelopmentItems(groups: IssueDevelopmentGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}
