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

/**
 * Structured error codes on Epicstory GitHub workflow HTTP failures (typically 422 bodies).
 * See API `global-exception.filter` merging `HttpException` object payloads.
 */
export type IGithubIntegrationApiErrorCode =
  | "GITHUB_WORKSPACE_INSTALL_REQUIRED"
  | "GITHUB_MEMBER_OAUTH_REQUIRED"
  | "GITHUB_MEMBER_TOKEN_EXPIRED"
  | "GITHUB_MEMBER_TOKEN_DECRYPT_FAILED"
  | "GITHUB_MEMBER_REAUTHORIZE_REQUIRED"
  | "GITHUB_MEMBER_REPO_PERMISSION_DENIED";

/**
 * GitHub `/app/installations/:id` probe for persisted workspace linkage (best-effort on status load).
 * `skipped_*` means Epicstory cannot or should not imply GitHub revoked the installation.
 */
export type IGithubInstallationRemoteVerification =
  | "skipped_no_install_record"
  | "skipped_app_not_registered"
  | "skipped_missing_private_key"
  | "ok"
  | "missing_on_github"
  | "error";

/** GET `/integrations/github/workspaces/:workspaceId/status` */
export type IGithubIntegrationStatus = {
  appConfigured: boolean;
  installation: IGithubInstallationSummary | null;
  user: IGithubUserLinkSummary | null;
  installationRemoteVerification: IGithubInstallationRemoteVerification;
  /** User-safe excerpt when verification is `error` (truncated upstream). */
  installationRemoteVerificationDetail: string | null;
};

/** GitHub App installation repository visible in workspace catalogues and issue repo pickers. */
export type IGithubCatalogRepository = {
  githubRepoId: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string | null;
  private: boolean;
  htmlUrl: string;
};

/** Persisted on `project.issue.github_branch` (jsonb). */
export type IIssueGithubBranchStored = {
  branchName: string;
  owner: string;
  repoName: string;
};

/** Enriched on issue fetch (includes GitHub existence probe). */
export type IIssueGithubBranch = IIssueGithubBranchStored & {
  fullName: string;
  htmlUrl: string;
  existsOnGithub: boolean;
};

/** Linked branch discovered via push webhooks or created from Epicstory. */
export type IGithubIssueBranchLink = {
  id: number;
  owner: string;
  repoName: string;
  branchName: string;
  fullName: string;
  htmlUrl: string;
  source: "webhook_push" | "epicstory_create" | "manual";
  firstLinkedAt: string;
  lastPushedAt: string;
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
