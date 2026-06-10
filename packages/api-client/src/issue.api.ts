import type {
  FindIssuesQuery,
  IIssue,
  IIssueAttachmentListItem,
  IIssueFeed,
  IPage,
  UpdateIssueData,
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
    const { projectId, ...params } = query;
    return this.axios
      .get<IPage<IIssueWire>>(`/projects/${projectId}/issues`, { params })
      .then((res) => mapPageIssues(res.data));
  }

  fetchIssue(issueId: number): Promise<IIssue> {
    return this.axios
      .get<IIssueWire>(`/issues/${issueId}`)
      .then((res) => mapIssue(res.data));
  }

  createIssue(
    projectId: number,
    data: { title: string; description?: JSONContent; parentIssueId?: number },
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

  async removeIssue(issueId: number): Promise<void> {
    await this.axios.delete(`/issues/${issueId}`);
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
