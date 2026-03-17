import { InjectAxios } from "@/core/axios";
import type { Page, PageQuery } from "@/core/types";
import type { BacklogItem } from "@/domain/backlog";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { Project } from "../types/project.type";

@injectable()
export class ProjectApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findProject(id: number) {
    return this.axios.get(`/projects/${id}`).then((res) => res.data);
  }

  findBacklogItems(projectId: number, query: PageQuery) {
    return this.axios
      .get<Page<BacklogItem>>(`/projects/${projectId}/backlog-items`, { params: query })
      .then((res) => res.data);
  }

  createProject(workspaceId: number, name: string) {
    return this.axios.post<Project>(`/workspaces/${workspaceId}/projects`, { name }).then((res) => res.data);
  }
}
