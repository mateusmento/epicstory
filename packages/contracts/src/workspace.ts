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
  issueKeyPrefix: string;
  issueCount: number;
  teamId: number;
};

export type CreateWorkspaceProjectBody = {
  name: string;
  issueKeyPrefix?: string;
  teamId: number;
};

export type UpdateProjectTeamBody = {
  teamId: number;
};

export type Team = {
  id: number;
  name: string;
};
