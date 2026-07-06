import type { IIssue } from "./issue";

export type SprintStatus = "planned" | "active" | "completed";

export type ISprint = {
  id: number;
  teamId: number;
  workspaceId: number;
  name: string;
  status: SprintStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdById: number;
  createdAt: string;
  itemCount: number;
  /** Count of sprint items whose completedStatus is 'done'. 0 for non-completed sprints. */
  completedItemCount: number;
};

export type ISprintItem = {
  id: number;
  sprintId: number;
  issue: IIssue;
  order: number;
  /** Snapshot of issue.status at sprint completion. Null while sprint is active. */
  completedStatus: string | null;
  /** Sprint this item was routed to after completion. Null = stays in backlog. */
  destinationSprintId: number | null;
};

export type FindSprintsQuery = { status?: SprintStatus };

export type CompleteSprintResult = {
  sprint: ISprint;
  items: ISprintItem[];
  nextSprintId: number | null;
};
