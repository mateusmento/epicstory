export type ProjectFilterField = "dueDate" | "status" | "priority" | "labels" | "title" | "parentIssueId";

export type ProjectFilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "notContains";

export type ProjectFilterValue = string | number | null | undefined | number[] | { ids: number[] }; // reserved for future expansion

export type ProjectFilter = {
  field: ProjectFilterField;
  operator: ProjectFilterOperator;
  value: ProjectFilterValue;
};

export const FILTER_FIELDS: Record<ProjectFilterField, string> = {
  dueDate: "Due date",
  status: "Status",
  priority: "Priority",
  labels: "Labels",
  title: "Title",
  parentIssueId: "Parent issue",
};

export const FILTER_OPERATORS: Record<ProjectFilterOperator, string> = {
  eq: "is",
  neq: "is not",
  gt: "after",
  gte: "on or after",
  lt: "before",
  lte: "on or before",
  contains: "contains",
  notContains: "does not contain",
};

export const FIELD_ALLOWED_OPERATORS: Record<ProjectFilterField, ProjectFilterOperator[]> = {
  dueDate: ["gt", "gte", "lt", "lte"],
  status: ["eq", "neq"],
  priority: ["eq", "neq"],
  labels: ["contains", "notContains"],
  title: ["contains", "notContains"],
  parentIssueId: ["eq", "neq"],
};

export function defaultOperator(field: ProjectFilterField): ProjectFilterOperator {
  return FIELD_ALLOWED_OPERATORS[field][0]!;
}

export function createDefaultFilter(field: ProjectFilterField): ProjectFilter {
  return {
    field,
    operator: defaultOperator(field),
    value: field === "labels" ? [] : undefined,
  };
}
