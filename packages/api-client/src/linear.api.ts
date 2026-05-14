import type {
  ILinearConnection,
  ILinearImportJob,
  ILinearMismatch,
  ILinearProject,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

export type {
  ILinearConnection as LinearConnection,
  ILinearImportJob as LinearImportJob,
  ILinearMismatch as LinearMismatch,
  ILinearProject as LinearProject,
} from "@epicstory/contracts";

@injectable()
export class LinearIntegrationApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  getWorkspaceConnection(workspaceId: number) {
    return this.axios
      .get<ILinearConnection | null>(
        `/integrations/linear/workspaces/${workspaceId}/connection`,
      )
      .then((r) => r.data);
  }

  disconnectWorkspace(workspaceId: number) {
    return this.axios
      .delete(`/integrations/linear/workspaces/${workspaceId}/connection`)
      .then((r) => r.data);
  }

  listProjects(workspaceId: number) {
    return this.axios
      .get<
        ILinearProject[]
      >(`/integrations/linear/workspaces/${workspaceId}/projects`)
      .then((r) => r.data);
  }

  createImportJob(
    workspaceId: number,
    body: {
      importAll: boolean;
      projectIds: string[];
      mappings?: unknown;
    },
  ) {
    return this.axios
      .post<ILinearImportJob>(
        `/integrations/linear/workspaces/${workspaceId}/import-jobs`,
        body,
      )
      .then((r) => r.data);
  }

  getImportJob(jobId: string) {
    return this.axios
      .get<ILinearImportJob>(
        `/integrations/linear/workspaces/import-jobs/${jobId}`,
      )
      .then((r) => r.data);
  }

  getMismatches(jobId: string) {
    return this.axios
      .get<
        ILinearMismatch[]
      >(`/integrations/linear/workspaces/import-jobs/${jobId}/mismatches`)
      .then((r) => r.data);
  }
}
