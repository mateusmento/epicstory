import type { IssueFilter, IssueFilterField, IssueFilterOperator } from "@epicstory/contracts";

export const FILTER_FIELDS: Record<IssueFilterField, string> = {
  dueDate: "Due date",
  status: "Status",
  priority: "Priority",
  labels: "Labels",
  title: "Title",
  parentIssueId: "Parent issue",
};

export const FILTER_OPERATORS: Record<IssueFilterOperator, string> = {
  eq: "is",
  neq: "is not",
  gt: "after",
  gte: "on or after",
  lt: "before",
  lte: "on or before",
  contains: "contains",
  notContains: "does not contain",
};

export const FIELD_ALLOWED_OPERATORS: Record<IssueFilterField, IssueFilterOperator[]> = {
  dueDate: ["gt", "gte", "lt", "lte"],
  status: ["eq", "neq"],
  priority: ["eq", "neq"],
  labels: ["contains", "notContains"],
  title: ["contains", "notContains"],
  parentIssueId: ["eq", "neq"],
};

export function defaultOperator(field: IssueFilterField): IssueFilterOperator {
  return FIELD_ALLOWED_OPERATORS[field][0]!;
}

export function createDefaultFilter(field: IssueFilterField): IssueFilter {
  return {
    field,
    operator: defaultOperator(field),
    value: field === "labels" ? [] : undefined,
  };
}
