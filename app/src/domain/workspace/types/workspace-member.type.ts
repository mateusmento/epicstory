import type { User } from "@/domain/auth";

export type WorkspaceMember = {
  id: number;
  name: string;
  userId: number;
  role: number;
  user: User;
};
