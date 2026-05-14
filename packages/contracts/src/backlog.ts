import type { IIssue } from "./issue";

export type IBacklogItem = {
  id: number;
  issue: IIssue;
  order: number;
  previousId: number;
  nextId: number;
};

export type BacklogItemFieldFilter = {
  field: string;
  operator: string;
  value: unknown;
};

export type FindBacklogItemsQuery = {
  orderBy?: string;
  order?: string;
  page: number;
  count: number;
  projectId: number;
  filters?: BacklogItemFieldFilter[];
};
