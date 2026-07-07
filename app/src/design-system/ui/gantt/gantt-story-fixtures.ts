import type { GanttDependency, GanttGroup, GanttItem } from "./types";

export const ganttStoryGroups: GanttGroup[] = [
  { id: "p1", label: "Platform" },
  { id: "p2", label: "Mobile" },
];

export const ganttStoryItems: GanttItem[] = [
  {
    id: "e1",
    groupId: "p1",
    label: "Auth overhaul",
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-07-21T00:00:00.000Z",
  },
  {
    id: "e2",
    groupId: "p1",
    label: "Timeline MVP",
    startsAt: null,
    endsAt: null,
  },
  {
    id: "e3",
    groupId: "p2",
    label: "Push notifications",
    startsAt: "2026-07-10T00:00:00.000Z",
    endsAt: "2026-08-05T00:00:00.000Z",
  },
];

export const ganttStoryDependencies: GanttDependency[] = [
  { id: "d1", dependentItemId: "e3", dependsOnItemId: "e1" },
];
