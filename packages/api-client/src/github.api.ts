import type { IGithubIntegrationStatus } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

export type { IGithubIntegrationStatus } from "@epicstory/contracts";

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
}
