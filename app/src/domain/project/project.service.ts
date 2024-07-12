import { InjectAxios } from "@/core/axios";
import type { Project } from "@/domain/project/project.type";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

@injectable()
export class ProjectService {
  constructor(@InjectAxios() private axios: Axios) {}

  createProject(workspaceId: number, name: string) {
    return this.axios.post<Project>(`/workspaces/${workspaceId}/projects`, { name }).then((res) => res.data);
  }
}
