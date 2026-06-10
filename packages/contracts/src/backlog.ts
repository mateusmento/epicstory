import type { IssueFilter } from "./issue-filter";
import type { IIssue } from "./issue";

export type IBacklogItem = {
  id: number;
  issue: IIssue;
  order: number;
  previousId: number;
  nextId: number;
};

export type FindBacklogItemsQuery = {
  orderBy?: string;
  order?: string;
  page: number;
  count: number;
  projectId: number;
  /** Issue-column criteria; applied when listing backlog items for a project. */
  filters?: IssueFilter[];
};
