import { IUser } from "./user";

export type ITeam = {
  id: number;
  name: string;
  workspaceId: number;
  sprintCadenceDays: number;
};

export type ITeamMember = {
  id: number;
  userId: number;
  user: IUser;
  workspaceMemberId: number;
  joinedAt: string;
};
