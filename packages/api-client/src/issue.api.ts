import type {
  CreateIssueDependencyBody,
  FindIssuesQuery,
  IIssue,
  IIssueAttachmentListItem,
  IIssueFeed,
  IssueDependency,
  IPage,
  IssueType,
  UpdateIssueData,
  UpdateIssueScheduleBody,
  UploadedAttachment,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";
import {
  mapIssue,
  mapPageIssues,
  wireUpdateIssueData,
  type IIssueWire,
} from "./issue.mapper";

@injectable()
export class IssueApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  fetchIssues(query: FindIssuesQuery): Promise<IPage<IIssue>> {
    const { projectId, workspaceId, projectIds, ...params } = query;
    const requestParams = {
      ...params,
      ...(projectIds?.length ? { projectIds: projectIds.join(",") } : {}),
    };

    const scopedWorkspaceId = Number(workspaceId);
    if (Number.isFinite(scopedWorkspaceId)) {
      return this.axios
        .get<IPage<IIssueWire>>(`/workspaces/${scopedWorkspaceId}/issues`, {
          params: requestParams,
        })
        .then((res) => mapPageIssues(res.data));
    }

    const scopedProjectId = Number(projectId);
    if (!Number.isFinite(scopedProjectId)) {
      return Promise.reject(
        new Error("fetchIssues requires workspaceId or projectId"),
      );
    }

    return this.axios
      .get<IPage<IIssueWire>>(`/projects/${scopedProjectId}/issues`, {
        params: requestParams,
      })
      .then((res) => mapPageIssues(res.data));
  }

  fetchIssue(issueId: number): Promise<IIssue> {
    return this.axios
      .get<IIssueWire>(`/issues/${issueId}`)
      .then((res) => mapIssue(res.data));
  }

  createIssue(
    projectId: number,
    data: {
      title: string;
      description?: JSONContent;
      parentIssueId?: number;
      issueType?: IssueType;
    },
  ): Promise<IIssue> {
    return this.axios
      .post<IIssueWire>(`/projects/${projectId}/issues`, data)
      .then((res) => mapIssue(res.data));
  }

  updateIssue(issueId: number, data: UpdateIssueData): Promise<IIssue> {
    return this.axios
      .patch<IIssueWire>(`/issues/${issueId}`, wireUpdateIssueData(data))
      .then((res) => mapIssue(res.data));
  }

  updateIssueSchedule(
    issueId: number,
    data: UpdateIssueScheduleBody,
  ): Promise<IIssue> {
    return this.axios
      .patch<IIssueWire>(`/issues/${issueId}/schedule`, data)
      .then((res) => mapIssue(res.data));
  }

  createIssueDependency(
    issueId: number,
    data: CreateIssueDependencyBody,
  ): Promise<IssueDependency> {
    return this.axios
      .post<IssueDependency>(`/issues/${issueId}/dependencies`, data)
      .then((res) => res.data);
  }

  removeIssueDependency(issueId: number, dependencyId: number): Promise<void> {
    return this.axios
      .delete(`/issues/${issueId}/dependencies/${dependencyId}`)
      .then(() => undefined);
  }

  countIssueDescendants(issueId: number): Promise<{ count: number }> {
    return this.axios
      .get<{ count: number }>(`/issues/${issueId}/descendant-count`)
      .then((res) => res.data);
  }

  async removeIssue(
    issueId: number,
    options?: { deleteSubIssues?: boolean },
  ): Promise<void> {
    await this.axios.delete(`/issues/${issueId}`, {
      data: { deleteSubIssues: options?.deleteSubIssues === true },
    });
  }

  async addAssignee(issueId: number, userId: number): Promise<IIssue> {
    return this.axios
      .post<IIssueWire>(`/issues/${issueId}/assignees`, { userId })
      .then((res) => mapIssue(res.data));
  }

  async removeAssignee(issueId: number, userId: number): Promise<IIssue> {
    return this.axios
      .delete<IIssueWire>(`/issues/${issueId}/assignees/${userId}`)
      .then((res) => mapIssue(res.data));
  }

  async addLabel(issueId: number, labelId: number): Promise<IIssue> {
    return this.axios
      .post<IIssueWire>(`/issues/${issueId}/labels`, { labelId })
      .then((res) => mapIssue(res.data));
  }

  async removeLabel(issueId: number, labelId: number): Promise<IIssue> {
    return this.axios
      .delete<IIssueWire>(`/issues/${issueId}/labels/${labelId}`)
      .then((res) => mapIssue(res.data));
  }

  uploadAttachment(issueId: number, file: File): Promise<UploadedAttachment> {
    const form = new FormData();
    form.append("file", file);
    return this.axios
      .post<UploadedAttachment>(`/issues/${issueId}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  }

  fetchIssueFeed(issueId: number, limit?: number): Promise<IIssueFeed> {
    return this.axios
      .get<IIssueFeed>(`/issues/${issueId}/feed`, {
        params: limit != null ? { limit } : undefined,
      })
      .then((res) => res.data);
  }

  listIssueAttachments(issueId: number): Promise<IIssueAttachmentListItem[]> {
    return this.axios
      .get<IIssueAttachmentListItem[]>(`/issues/${issueId}/attachments`)
      .then((res) => res.data);
  }

  deleteIssueAttachment(issueId: number, attachmentId: number): Promise<void> {
    return this.axios
      .delete(`/issues/${issueId}/attachments/${attachmentId}`)
      .then(() => undefined);
  }

  postIssueComment(
    issueId: number,
    body: { content: JSONContent; attachmentIds?: number[] },
  ): Promise<unknown> {
    return this.axios
      .post(`/issues/${issueId}/comments`, body)
      .then((res) => res.data);
  }

  replyToIssueComment(
    issueId: number,
    parentMessageId: number,
    body: { content: JSONContent; attachmentIds?: number[] },
  ): Promise<unknown> {
    return this.axios
      .post(`/issues/${issueId}/comments/${parentMessageId}/replies`, body)
      .then((res) => res.data);
  }
}
