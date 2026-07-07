export type GanttZoom = "year" | "quarter" | "month" | "week";

export type GanttGroup = { id: string; label: string };

export type GanttItem = {
  id: string;
  groupId: string;
  label: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type GanttDependency = {
  id: string;
  dependentItemId: string;
  dependsOnItemId: string;
};

export type GanttScheduleUpdate = {
  itemId: string;
  startsAt: string;
  endsAt: string;
};

export type GanttCreateDependency = {
  dependentItemId: string;
  dependsOnItemId: string;
};
