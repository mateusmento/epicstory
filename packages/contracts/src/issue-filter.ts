import { IIssue } from "./issue";

export type IssueFilterField = keyof Pick<
  IIssue,
  "dueDate" | "status" | "priority" | "labels" | "title" | "parentIssueId"
>;

export type IssueFilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "notContains";

/** One issue-column predicate. Value shape depends on field (see API find-backlog-items). */
export type IssueFilter = {
  field: IssueFilterField;
  operator: IssueFilterOperator;
  value: unknown;
};
