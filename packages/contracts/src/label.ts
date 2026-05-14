export type ILabel = {
  id: number;
  workspaceId: number;
  name: string;
  color: string;
  createdAt: string;
};

export type CreateLabelData = {
  name: string;
  color: string;
};

export type UpdateLabelData = {
  name: string;
  color: string;
};
