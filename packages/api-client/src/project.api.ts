import type { Project, UpdateProjectTeamBody } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class ProjectApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findProject(id: number) {
    return this.axios.get(`/projects/${id}`).then((res) => res.data);
  }

  createProject(workspaceId: number, name: string) {
    return this.axios
      .post<Project>(`/workspaces/${workspaceId}/projects`, { name })
      .then((res) => res.data);
  }

  updateProjectTeam(projectId: number, data: UpdateProjectTeamBody) {
    return this.axios
      .patch<Project>(`/projects/${projectId}/team`, data)
      .then((res) => res.data);
  }

  recordAccess(projectId: number) {
    return this.axios
      .put(`/projects/${projectId}/access`)
      .then((res) => res.data);
  }
}
