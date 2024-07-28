export type WorkspaceMember = {
  id: number;
  name: string;
  userId: number;
  user: {
    name: string;
    email: string;
  };
};
