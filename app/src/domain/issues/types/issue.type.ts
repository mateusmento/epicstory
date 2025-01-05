import type { User } from "@/domain/auth";

export type Issue = {
  id: number;
  title: string;
  description: string;
  workspaceId: number;
  projectId: number;
  createdById: number;
  createdAt: string;
  status: string;
  dueDate: string;
  assignees: User[];
  priority: number;
};
