import { InjectAxios } from "@/core/axios";
import type { Page, PageQuery } from "@/core/types";
import type { Axios } from "axios";
import { isValid } from "date-fns";
import { injectable } from "tsyringe";
import type { Issue } from "../types";

/** JSON wire shape from the API before `dueDate` is parsed to `Date`. */
export type IssueWire = Omit<Issue, "dueDate" | "parentIssue" | "subIssues"> & {
  dueDate: string | null;
  parentIssue?: IssueWire | null;
  subIssues?: IssueWire[];
};

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}

export function toISOString(value: Date | null | undefined): string | null {
  if (value == null) return null;
  return value.toISOString();
}

export function issueFromApiResponse(wire: IssueWire): Issue {
  return {
    ...wire,
    dueDate: parseDate(wire.dueDate),
    parentIssue: wire.parentIssue != null ? issueFromApiResponse(wire.parentIssue) : wire.parentIssue,
    subIssues: wire.subIssues?.map(issueFromApiResponse),
  };
}

function mapPageIssues(page: Page<IssueWire>): Page<Issue> {
  return { ...page, content: page.content.map(issueFromApiResponse) };
}

export type UpdateIssueData = {
  title?: string;
  description?: string;
  status?: string;
  dueDate?: Date | null;
  priority?: number | null;
  parentIssueId?: number | null;
};

function serializeUpdateIssueData(data: UpdateIssueData): Record<string, unknown> {
  const { dueDate, ...rest } = data;
  const payload: Record<string, unknown> = { ...rest };
  if (dueDate !== undefined) {
    payload.dueDate = toISOString(dueDate);
  }
  return payload;
}

export type FindIssuesQuery = PageQuery & {
  projectId: number;
  search?: string;
  assigneeId?: number;
};

export type UploadedAttachment = {
  id: number;
  url: string;
  mimeType: string;
  originalFilename: string;
  byteSize: number;
};

@injectable()
export class IssueApi {
  constructor(@InjectAxios() private axios: Axios) {}

  fetchIssues({ projectId, ...query }: FindIssuesQuery) {
    return this.axios
      .get<Page<IssueWire>>(`/projects/${projectId}/issues`, { params: query })
      .then((res) => mapPageIssues(res.data));
  }

  fetchIssue(issueId: number) {
    return this.axios.get<IssueWire>(`/issues/${issueId}`).then((res) => issueFromApiResponse(res.data));
  }

  createIssue(projectId: number, data: { title: string; description?: string; parentIssueId?: number }) {
    return this.axios
      .post<IssueWire>(`/projects/${projectId}/issues`, data)
      .then((res) => issueFromApiResponse(res.data));
  }

  updateIssue(issueId: number, data: UpdateIssueData) {
    return this.axios
      .patch<IssueWire>(`/issues/${issueId}`, serializeUpdateIssueData(data))
      .then((res) => issueFromApiResponse(res.data));
  }

  async removeIssue(issueId: number) {
    await this.axios.delete(`/issues/${issueId}`);
  }

  async addAssignee(issueId: number, userId: number) {
    return this.axios
      .post<IssueWire>(`/issues/${issueId}/assignees`, { userId })
      .then((res) => issueFromApiResponse(res.data));
  }

  async removeAssignee(issueId: number, userId: number) {
    return this.axios
      .delete<IssueWire>(`/issues/${issueId}/assignees/${userId}`)
      .then((res) => issueFromApiResponse(res.data));
  }

  async addLabel(issueId: number, labelId: number) {
    return this.axios
      .post<IssueWire>(`/issues/${issueId}/labels`, { labelId })
      .then((res) => issueFromApiResponse(res.data));
  }

  async removeLabel(issueId: number, labelId: number) {
    return this.axios
      .delete<IssueWire>(`/issues/${issueId}/labels/${labelId}`)
      .then((res) => issueFromApiResponse(res.data));
  }

  uploadAttachment(issueId: number, file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.axios
      .post<UploadedAttachment>(`/issues/${issueId}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  }
}
