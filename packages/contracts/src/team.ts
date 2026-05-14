import { IUser } from "./user";

export type ITeam = {
  id: number;
  name: string;
};

export type ITeamMember = {
  id: number;
  userId: number;
  user: IUser;
  workspaceMemberId: number;
  joinedAt: string;
};
