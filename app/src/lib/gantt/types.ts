export type GanttZoom = "year" | "quarter" | "month" | "week";

export type GanttViewport = {
  zoom: GanttZoom;
  scrollX: number;
  viewportWidth: number;
  anchorDate: Date;
};

export type GanttPoint = { x: number; y: number };

export type GanttRowLayout = {
  itemId: string;
  groupId: string;
  rowIndex: number;
  y: number;
  height: number;
};

export type GanttBarLayout = {
  itemId: string;
  rowIndex: number;
  x: number;
  width: number;
  y: number;
  height: number;
  startsAt: string;
  endsAt: string;
};

export type GanttTick = {
  x: number;
  label: string;
  subLabel?: string;
};

export type GanttGroupInput = { id: string; label: string };
export type GanttItemInput = {
  id: string;
  groupId: string;
  label: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type GanttDependencyInput = {
  id: string;
  dependentItemId: string;
  dependsOnItemId: string;
};

export type GanttInteractionState =
  | { mode: "idle" }
  | { mode: "panning"; startScrollX: number; startClientX: number }
  | { mode: "drawing"; itemId: string; rowIndex: number; startX: number; currentX: number }
  | { mode: "moving"; itemId: string; originalStartsAt: string; originalEndsAt: string; deltaX: number }
  | { mode: "resizing"; itemId: string; edge: "start" | "end"; anchorDate: string; currentX: number }
  | { mode: "linking"; sourceItemId: string; sourceAnchor: GanttPoint; cursor: GanttPoint };
