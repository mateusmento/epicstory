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

/** Linked GitHub repository row for a project (list + link response). */
export type IGithubProjectRepoLink = {
  id: number;
  projectId: number;
  owner: string;
  name: string;
  fullName: string;
  githubRepoId: string;
  defaultBranch: string | null;
  createdAt: string;
};
