export type ILinearConnection = {
  id: number;
  workspaceId: number | null;
  userId: number | null;
  createdByUserId: number;
  linearOrgId: string;
  linearOrgName: string;
  status: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ILinearProject = {
  id: string;
  name: string;
  state?: string;
  teamId?: string;
};

export type ILinearImportJob = {
  id: string;
  linearConnectionId: number;
  workspaceId: number;
  createdByUserId: number;
  status: string;
  params: unknown;
  progress: unknown;
  lastError?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type ILinearMismatch = {
  id: number;
  jobId: string;
  type: string;
  message: string;
  payload: unknown;
  createdAt: string;
};
