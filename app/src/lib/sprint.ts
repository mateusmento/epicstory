import type { ISprint, ISprintItem } from "@epicstory/contracts";

export function sprintDateLabel(sprint: ISprint): string {
  const d = sprint.startsAt ? new Date(sprint.startsAt) : new Date(sprint.createdAt);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function burndownProgress(sprint: ISprint): number {
  if (!sprint.startsAt || !sprint.endsAt) return 0;
  const start = new Date(sprint.startsAt).getTime();
  const end = new Date(sprint.endsAt).getTime();
  const now = Date.now();
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

export function successPercent(sprint: ISprint): number {
  if (sprint.itemCount === 0) return 0;
  return Math.round((sprint.completedItemCount / sprint.itemCount) * 100);
}

export function statusDot(status: string): string {
  switch (status) {
    case "done":
      return "bg-green-500";
    case "doing":
      return "bg-blue-500";
    default:
      return "bg-muted-foreground/40";
  }
}

export function statusBadgeClass(status: string | null): string {
  switch (status) {
    case "done":
      return "text-green-600 bg-green-50 dark:bg-green-950";
    case "doing":
      return "text-blue-600 bg-blue-50 dark:bg-blue-950";
    default:
      return "text-muted-foreground bg-muted";
  }
}

export function destinationValue(item: ISprintItem): string {
  return item.destinationSprintId !== null ? String(item.destinationSprintId) : "backlog";
}
