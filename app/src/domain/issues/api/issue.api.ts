import { InjectAxios } from "@/core/axios";
import type { Issue } from "../types";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { Page, PageQuery } from "@/core/types";

export type UpdateIssueData = {
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string | null;
  priority?: number | null;
};

export type FindIssuesQuery = PageQuery & {
  projectId: number;
};

@injectable()
export class IssueApi {
  constructor(@InjectAxios() private axios: Axios) {}

  fetchIssues({ projectId, ...query }: FindIssuesQuery) {
    return this.axios
      .get<Page<Issue>>(`/projects/${projectId}/issues`, { params: query })
      .then((res) => res.data);
  }

  fetchIssue(issueId: number) {
    return this.axios.get<Issue>(`/issues/${issueId}`).then((res) => res.data);
  }

  createIssue(projectId: number, title: string) {
    return this.axios.post<Issue>(`/projects/${projectId}/issues`, { title }).then((res) => res.data);
  }

  updateIssue(issueId: number, data: UpdateIssueData) {
    return this.axios.patch<Issue>(`/issues/${issueId}`, data).then((res) => res.data);
  }

  async removeIssue(issueId: number) {
    await this.axios.delete(`/issues/${issueId}`);
  }

  async addAssignee(issueId: number, userId: number) {
    return this.axios.post<Issue>(`/issues/${issueId}/assignees`, { userId }).then((res) => res.data);
  }
}
