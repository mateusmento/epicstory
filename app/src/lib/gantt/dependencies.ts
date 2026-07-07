import type { GanttBarLayout, GanttDependencyInput, GanttPoint } from "./types";
import { GANTT_LINK_HANDLE_GAP_PX, GANTT_LINK_HANDLE_SIZE_PX, GANTT_RESIZE_HANDLE_PX } from "./scale";

function visualBarEdgeX(bar: GanttBarLayout, side: "start" | "end"): number {
  return side === "start" ? bar.x + GANTT_RESIZE_HANDLE_PX : bar.x + bar.width - GANTT_RESIZE_HANDLE_PX;
}

/** Center offset from the visual bar edge to a link-handle bullet. */
export function linkHandleCenterOffsetFromVisualEdge(): number {
  return GANTT_LINK_HANDLE_GAP_PX + GANTT_LINK_HANDLE_SIZE_PX / 2;
}

/** Bar-local X for a link-handle center (relative to the bar layout box). */
export function barLinkHandleLocalCenterX(barWidth: number, side: "start" | "end"): number {
  const offset = linkHandleCenterOffsetFromVisualEdge();
  const visualStart = GANTT_RESIZE_HANDLE_PX;
  const visualEnd = barWidth - GANTT_RESIZE_HANDLE_PX;
  return side === "start" ? visualStart - offset : visualEnd + offset;
}

/** SVG path endpoint on the visible bar edge (inside resize handles). */
export function barEdgePoint(bar: GanttBarLayout, side: "start" | "end"): GanttPoint {
  return { x: visualBarEdgeX(bar, side), y: bar.y + bar.height / 2 };
}

/** Exterior link-handle position (hit target + bullet visual). */
export function barLinkHandlePoint(bar: GanttBarLayout, side: "start" | "end"): GanttPoint {
  const edge = visualBarEdgeX(bar, side);
  const offset = linkHandleCenterOffsetFromVisualEdge();
  const x = side === "start" ? edge - offset : edge + offset;
  return { x, y: bar.y + bar.height / 2 };
}

export function dependencyPath(from: GanttPoint, to: GanttPoint): string {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5);
  const c1x = from.x + dx;
  const c1y = from.y;
  const c2x = to.x - dx;
  const c2y = to.y;
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

export function previewDependencyPath(from: GanttPoint, cursor: GanttPoint): string {
  return dependencyPath(from, cursor);
}

export function committedDependencyPaths(
  dependencies: GanttDependencyInput[],
  barsByItemId: Map<string, GanttBarLayout>,
): { id: string; d: string }[] {
  const paths: { id: string; d: string }[] = [];

  for (const dep of dependencies) {
    const blocker = barsByItemId.get(dep.dependsOnItemId);
    const dependent = barsByItemId.get(dep.dependentItemId);
    if (!blocker || !dependent) continue;
    const from = barEdgePoint(blocker, "end");
    const to = barEdgePoint(dependent, "start");
    paths.push({ id: dep.id, d: dependencyPath(from, to) });
  }

  return paths;
}
