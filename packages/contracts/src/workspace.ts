import type { IUser } from "./user";

/** Matches api WorkspaceRole: OWNER=0, ADMIN=1, COLLABORATOR=2 */
export enum WorkspaceRole {
  OWNER = 0,
  ADMIN = 1,
  COLLABORATOR = 2,
}

export type IWorkspace = {
  id: number;
  name: string;
  onlineUsersSnapshot: number[];
};

export type WorkspaceMember = {
  id: number;
  name: string;
  userId: number;
  role: WorkspaceRole | number;
  user: IUser;
  joinedAt: string;
};

export type TransferWorkspaceOwnershipBody = {
  newOwnerUserId: number;
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
