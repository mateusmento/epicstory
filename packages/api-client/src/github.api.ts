import type {
  IGithubCatalogRepository,
  IGithubCreateIssueBranchResponse,
  IGithubIntegrationStatus,
  IGithubIssueBranchLink,
  IGithubIssuePullRequestLink,
  Page,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

export type {
  IGithubCatalogRepository,
  IGithubCreateIssueBranchResponse,
  IGithubIntegrationStatus,
  IGithubIssueBranchLink,
  IGithubIssuePullRequestLink,
} from "@epicstory/contracts";

@injectable()
export class GithubIntegrationApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  getStatus(workspaceId: number) {
    return this.axios
      .get<IGithubIntegrationStatus>(
        `/integrations/github/workspaces/${workspaceId}/status`,
      )
      .then((r) => r.data);
  }

  listRepositories(
    workspaceId: number,
    params?: { page?: number; count?: number },
  ) {
    return this.axios
      .get<
        Page<IGithubCatalogRepository>
      >(`/integrations/github/workspaces/${workspaceId}/repositories`, { params })
      .then((r) => r.data);
  }

  disconnectInstallation(workspaceId: number) {
    return this.axios.delete(
      `/integrations/github/workspaces/${workspaceId}/installation`,
    );
  }

  disconnectUser(workspaceId: number) {
    return this.axios.delete(
      `/integrations/github/workspaces/${workspaceId}/user`,
    );
  }

  listIssueGithubPullRequests(issueId: number) {
    return this.axios
      .get<
        IGithubIssuePullRequestLink[]
      >(`/integrations/github/issues/${issueId}/pull-requests`)
      .then((r) => r.data);
  }

  listIssueGithubBranches(issueId: number) {
    return this.axios
      .get<
        IGithubIssueBranchLink[]
      >(`/integrations/github/issues/${issueId}/branches`)
      .then((r) => r.data);
  }

  createIssueGithubBranch(
    workspaceId: number,
    issueId: number,
    body: {
      owner: string;
      name: string;
      baseBranch?: string;
      branchName?: string;
    },
  ) {
    return this.axios
      .post<IGithubCreateIssueBranchResponse>(
        `/integrations/github/workspaces/${workspaceId}/issues/${issueId}/branches`,
        body,
      )
      .then((r) => r.data);
  }

  createIssueGithubPull(
    workspaceId: number,
    issueId: number,
    body: {
      owner: string;
      name: string;
      headBranch: string;
      baseBranch?: string;
      title: string;
      bodyMarkdown?: string;
      draft?: boolean;
    },
  ) {
    return this.axios
      .post<IGithubIssuePullRequestLink>(
        `/integrations/github/workspaces/${workspaceId}/issues/${issueId}/pulls`,
        body,
      )
      .then((r) => r.data);
  }
}
