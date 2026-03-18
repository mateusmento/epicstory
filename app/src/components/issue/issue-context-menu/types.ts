import type { UpdateIssueData } from "@/domain/issues";

export type IssueContextMenuActions = {
  updateIssue(issueId: number, data: UpdateIssueData): unknown;
  addAssignee(issueId: number, userId: number): unknown;
  removeAssignee(issueId: number, userId: number): unknown;
  addLabel(issueId: number, labelId: number): unknown;
  removeLabel(issueId: number, labelId: number): unknown;
  removeIssue(issueId: number): unknown;
};
