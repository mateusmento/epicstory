export type Workspace = {
  id: number;
  name: string;
};

export type Project = {
  id: number;
  name: string;
  workspaceId: number;
};

export type WorkspaceMember = {
  id: number;
  workspaceId: number;
  userId: number;
  user: {
    id: number;
    name: string;
  };
};
