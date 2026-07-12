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

/** Existing Linear project ↔ Epicstory project link for a workspace connection. */
export type ILinearProjectMap = {
  linearProjectId: string;
  epicProjectId: number;
};

export type ILinearImportProjectOutcome = {
  linearProjectId: string;
  name: string;
  mode: "created" | "mapped";
  epicProjectId: number;
};

export type ILinearImportProgress = {
  importedProjects?: number;
  importedIssues?: number;
  lastProject?: string;
  createdProjects?: number;
  mappedProjects?: number;
  outcomes?: ILinearImportProjectOutcome[];
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
