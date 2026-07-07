import type { JSONContent } from "@tiptap/core";
import type { IIssueGithubBranch, IIssueGithubBranchStored } from "./github";
import type { ILabel } from "./label";
import type { IUser } from "./user";
import type { Project } from "./workspace";

export type { IIssueGithubBranch, IIssueGithubBranchStored };

export type IIssueProject = Pick<
  Project,
  "id" | "name" | "workspaceId" | "issueKeyPrefix"
>;

export type IssueType = "task" | "epic";

export type IIssue = {
  id: number;
  /** Stable external id, e.g. `EPIC-42`. */
  issueKey: string;
  issueNumber: number;
  title: string;
  description: JSONContent;
  workspaceId: number;
  projectId: number;
  project?: IIssueProject | null;
  createdById: number;
  createdAt: string;
  status: string;
  issueType: IssueType;
  startsAt: string | null;
  endsAt: string | null;
  dueDate: Date | null;
  assignees: IUser[];
  priority: number;
  labels: ILabel[];
  parentIssueId?: number | null;
  commentChannelId: number;
  parentIssue?: IIssue | null;
  subIssues?: IIssue[];
  /**
   * Legacy single-branch field (deprecated).
   * Branch links are now stored in `integration.issue_github_branches` and loaded via
   * `GET /integrations/github/issues/:issueId/branches`.
   */
  githubBranch?: IIssueGithubBranch | null;
};

export type UpdateIssueData = {
  title?: string;
  description?: JSONContent;
  status?: string;
  issueType?: IssueType;
  dueDate?: Date | null;
  priority?: number | null;
  parentIssueId?: number | null;
  /**
   * Legacy single-branch field (deprecated).
   * Use branch linking endpoints instead of persisting on the issue row.
   */
  githubBranch?: IIssueGithubBranchStored | null;
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
