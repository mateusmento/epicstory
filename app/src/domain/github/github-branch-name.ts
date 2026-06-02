export type IssueGithubCreatedBranch = {
  branchName: string;
  fullName: string;
  htmlUrl: string;
};

export function githubBranchTreeUrl(owner: string, repoName: string, branchName: string): string {
  return `https://github.com/${owner}/${repoName}/tree/${encodeURIComponent(branchName)}`;
}

/** Mirrors API default: `{issueKey}-{slug-from-title}` (leaf only, no `refs/heads/`). */
export function suggestGithubBranchLeaf(issueKey: string, title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = (slug || "branch").slice(0, 48);
  return `${issueKey}-${base}`;
}
