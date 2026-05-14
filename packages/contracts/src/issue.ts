import type { JSONContent } from "@tiptap/core";
import type { ILabel } from "./label";
import type { IUser } from "./user";

export type IIssue = {
  id: number;
  title: string;
  description: JSONContent;
  workspaceId: number;
  projectId: number;
  createdById: number;
  createdAt: string;
  status: string;
  dueDate: Date | null;
  assignees: IUser[];
  priority: number;
  labels: ILabel[];
  parentIssueId?: number | null;
  commentChannelId: number;
  parentIssue?: IIssue | null;
  subIssues?: IIssue[];
};

export type UpdateIssueData = {
  title?: string;
  description?: JSONContent;
  status?: string;
  dueDate?: Date | null;
  priority?: number | null;
  parentIssueId?: number | null;
};

export type FindIssuesQuery = {
  orderBy?: string;
  order?: string;
  page: number;
  count: number;
  projectId: number;
  search?: string;
  assigneeId?: number;
};
