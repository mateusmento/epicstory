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
