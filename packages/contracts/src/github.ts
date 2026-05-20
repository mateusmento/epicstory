export type IGithubInstallationSummary = {
  id: number;
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  suspendedAt: string | null;
};

export type IGithubUserLinkSummary = {
  githubUserId: string;
  githubLogin: string;
};

/** GET `/integrations/github/workspaces/:workspaceId/status` */
export type IGithubIntegrationStatus = {
  appConfigured: boolean;
  installation: IGithubInstallationSummary | null;
  user: IGithubUserLinkSummary | null;
};

export type IGithubCatalogRepository = {
  githubRepoId: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string | null;
  private: boolean;
  htmlUrl: string;
};

/** GET `/integrations/github/workspaces/:workspaceId/repositories` */
export type IGithubRepositoryCatalogPage = {
  page: number;
  perPage: number;
  totalCount: number;
  hasNextPage: boolean;
  repositories: IGithubCatalogRepository[];
};

/** POST `/integrations/github/workspaces/:workspaceId/issues/:issueId/branches` */
export type IGithubCreateIssueBranchResponse = {
  branchName: string;
  gitRef: string;
  tipSha: string;
};

/** GET `/integrations/github/issues/:issueId/pull-requests` */
export type IGithubIssuePullRequestLink = {
  id: number;
  issueId: number;
  githubPullRequestId: string;
  owner: string;
  repoName: string;
  fullName: string;
  prNumber: number;
  htmlUrl: string;
  headRef: string | null;
  baseRef: string | null;
  state: string;
  draft: boolean;
  merged: boolean;
  mergedAt: string | null;
  closedAt: string | null;
  githubUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Linked GitHub repository row for a project (list + link response). */
export type IGithubProjectRepoLink = {
  id: number;
  projectId: number;
  owner: string;
  name: string;
  fullName: string;
  githubRepoId: string;
  defaultBranch: string | null;
  /** Default target for issue branch/PR flows when multiple repos are linked. */
  isPrimary: boolean;
  createdAt: string;
};
