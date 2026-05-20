import type {
  IGithubIntegrationStatus,
  IGithubRepositoryCatalogPage,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

export type {
  IGithubIntegrationStatus,
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
}
