import type { ILabel } from "@epicstory/contracts";

export const storyIssueKeys = {
  backlog: "EP-42",
  inProgress: "EP-108",
  done: "EP-7",
} as const;

export const storyLabels: ILabel[] = [
  {
    id: 1,
    workspaceId: 1,
    name: "bug",
    color: "#ef4444",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    workspaceId: 1,
    name: "feature",
    color: "#3b82f6",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    workspaceId: 1,
    name: "design",
    color: "#a855f7",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];
