import type {
  IGithubCreateIssueBranchResponse,
  IGithubIntegrationStatus,
  IGithubIssuePullRequestLink,
  IGithubProjectRepoLink,
  IGithubRepositoryCatalogPage,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

export type {
  IGithubCreateIssueBranchResponse,
  IGithubIntegrationStatus,
  IGithubIssuePullRequestLink,
  IGithubProjectRepoLink,
  IGithubRepositoryCatalogPage,
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
    params?: { page?: number; perPage?: number },
  ) {
    return this.axios
      .get<IGithubRepositoryCatalogPage>(
        `/integrations/github/workspaces/${workspaceId}/repositories`,
        { params },
      )
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

  listProjectGithubRepos(workspaceId: number, projectId: number) {
    return this.axios
      .get<
        IGithubProjectRepoLink[]
      >(`/integrations/github/workspaces/${workspaceId}/projects/${projectId}/repos`)
      .then((r) => r.data);
  }

  linkProjectGithubRepo(
    workspaceId: number,
    projectId: number,
    body: { owner: string; name: string },
  ) {
    return this.axios
      .post<IGithubProjectRepoLink>(
        `/integrations/github/workspaces/${workspaceId}/projects/${projectId}/repos`,
        body,
      )
      .then((r) => r.data);
  }

  unlinkProjectGithubRepo(
    workspaceId: number,
    projectId: number,
    linkId: number,
  ) {
    return this.axios.delete(
      `/integrations/github/workspaces/${workspaceId}/projects/${projectId}/repos/${linkId}`,
    );
  }

  listIssueGithubPullRequests(issueId: number) {
    return this.axios
      .get<
        IGithubIssuePullRequestLink[]
      >(`/integrations/github/issues/${issueId}/pull-requests`)
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
