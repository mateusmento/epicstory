import type { IUser } from "./user";

export type IWorkspace = {
  id: number;
  name: string;
  onlineUsersSnapshot: number[];
};

export type WorkspaceMember = {
  id: number;
  name: string;
  userId: number;
  role: number;
  user: IUser;
  joinedAt: string;
};

export type Project = {
  id: number;
  name: string;
  workspaceId: number;
  /** Jira-style project key prefix (e.g. `EPIC` for issues `EPIC-1`). */
  issueKeyPrefix: string;
  issueCount: number;
};

export type CreateWorkspaceProjectBody = {
  name: string;
  /** Optional; must be unique in the workspace. When omitted, suggested from the name. */
  issueKeyPrefix?: string;
  teamId?: number;
};

export type Team = {
  id: number;
  name: string;
};
