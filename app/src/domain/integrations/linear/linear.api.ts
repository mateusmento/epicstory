import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

export type LinearConnection = {
  id: number;
  workspaceId: number | null;
  userId: number | null;
  createdByUserId: number;
  linearOrgId: string;
  linearOrgName: string;
  status: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LinearProject = {
  id: string;
  name: string;
  state?: string;
  teamId?: string;
};

export type LinearImportJob = {
  id: string;
  linearConnectionId: number;
  workspaceId: number;
  createdByUserId: number;
  status: string;
  params: any;
  progress: any;
  lastError?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type LinearMismatch = {
  id: number;
  jobId: string;
  type: string;
  message: string;
  payload: any;
  createdAt: string;
};

@injectable()
export class LinearIntegrationApi {
  constructor(@InjectAxios() private axios: Axios) {}

  getWorkspaceConnection(workspaceId: number) {
    return this.axios
      .get<LinearConnection | null>(`/integrations/linear/workspaces/${workspaceId}/connection`)
      .then((r) => r.data);
  }

  disconnectWorkspace(workspaceId: number) {
    return this.axios.delete(`/integrations/linear/workspaces/${workspaceId}/connection`).then((r) => r.data);
  }

  listProjects(workspaceId: number) {
    return this.axios
      .get<LinearProject[]>(`/integrations/linear/workspaces/${workspaceId}/projects`)
      .then((r) => r.data);
  }

  createImportJob(
    workspaceId: number,
    body: {
      importAll: boolean;
      projectIds: string[];
      mappings?: any;
    },
  ) {
    return this.axios
      .post<LinearImportJob>(`/integrations/linear/workspaces/${workspaceId}/import-jobs`, body)
      .then((r) => r.data);
  }

  getImportJob(jobId: string) {
    return this.axios
      .get<LinearImportJob>(`/integrations/linear/workspaces/import-jobs/${jobId}`)
      .then((r) => r.data);
  }

  getMismatches(jobId: string) {
    return this.axios
      .get<LinearMismatch[]>(`/integrations/linear/workspaces/import-jobs/${jobId}/mismatches`)
      .then((r) => r.data);
  }
}
