import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { Project } from "../types/project.type";
import type { Page } from "@/core/types";
import type { BacklogItem } from "@/domain/backlog";

@injectable()
export class ProjectApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findProject(id: number) {
    return this.axios.get(`/projects/${id}`).then((res) => res.data);
  }

  findProjectBacklogItems(id: number) {
    return this.axios.get<Page<BacklogItem>>(`/projects/${id}`).then((res) => res.data);
  }

  createProject(workspaceId: number, name: string) {
    return this.axios.post<Project>(`/workspaces/${workspaceId}/projects`, { name }).then((res) => res.data);
  }
}
