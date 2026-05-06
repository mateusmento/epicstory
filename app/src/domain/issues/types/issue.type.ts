import type { User } from "@/domain/auth";
import type { Label } from "@/domain/labels";
import type { JSONContent } from "@tiptap/core";

export type Issue = {
  id: number;
  title: string;
  description: JSONContent;
  workspaceId: number;
  projectId: number;
  createdById: number;
  createdAt: string;
  status: string;
  dueDate: Date | null;
  assignees: User[];
  priority: number;
  labels: Label[];
  parentIssueId?: number | null;
  commentChannelId: number;
  parentIssue?: Issue | null;
  subIssues?: Issue[];
};
