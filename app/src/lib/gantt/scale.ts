import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, startOfDay } from "date-fns";
import type { GanttTick, GanttViewport, GanttZoom } from "./types";

export const GANTT_ROW_HEIGHT = 40;
export const GANTT_BAR_HEIGHT = 24;
export const GANTT_GROUP_HEADER_HEIGHT = 32;
export const GANTT_HEADER_HEIGHT = 40;
export const GANTT_SIDEBAR_DEFAULT_WIDTH = 320;
export const GANTT_SIDEBAR_MIN_WIDTH = 200;
export const GANTT_SIDEBAR_MAX_WIDTH = 560;
/** Interior resize strip width at each bar end. */
export const GANTT_RESIZE_HANDLE_PX = 8;
/** Link-handle bullet diameter (must match GanttBar handle size). */
export const GANTT_LINK_HANDLE_SIZE_PX = 12;
/** Gap between the visible bar edge and the nearest point on a link-handle bullet. */
export const GANTT_LINK_HANDLE_GAP_PX = 8;
/** Extra hover padding around bar so exterior handles stay reachable. */
export const GANTT_BAR_HOVER_SLOP_PX = 14;

export function pixelsPerDay(zoom: GanttZoom): number {
  switch (zoom) {
    case "year":
      return 3;
    case "quarter":
      return 6;
    case "month":
      return 12;
    case "week":
      return 48;
  }
}

export function chartWidth(zoom: GanttZoom, start: Date, end: Date): number {
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  return days * pixelsPerDay(zoom);
}

export function dateToX(date: Date | string, viewport: GanttViewport): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const anchor = startOfDay(viewport.anchorDate);
  const target = startOfDay(d);
  const dayOffset = differenceInCalendarDays(target, anchor);
  return dayOffset * pixelsPerDay(viewport.zoom) - viewport.scrollX;
}

export function xToDate(x: number, viewport: GanttViewport): Date {
  const pxPerDay = pixelsPerDay(viewport.zoom);
  const dayOffset = Math.round((x + viewport.scrollX) / pxPerDay);
  return addDays(startOfDay(viewport.anchorDate), dayOffset);
}

export function snapDateToDay(date: Date): Date {
  return startOfDay(date);
}

export function visibleRange(viewport: GanttViewport): { start: Date; end: Date } {
  const pxPerDay = pixelsPerDay(viewport.zoom);
  const startOffset = Math.floor(viewport.scrollX / pxPerDay);
  const visibleDays = Math.ceil(viewport.viewportWidth / pxPerDay) + 2;
  const start = addDays(startOfDay(viewport.anchorDate), startOffset);
  const end = addDays(start, visibleDays);
  return { start, end };
}

export function scrollXForDate(date: Date, viewport: GanttViewport): number {
  const x = dateToX(date, { ...viewport, scrollX: 0 });
  return Math.max(0, x - viewport.viewportWidth / 2);
}

export type GanttSchedulableItem = { startsAt?: string | null; endsAt?: string | null };

/** Earliest chart origin: six months back, or earlier when scheduled work starts sooner. */
export function resolveChartAnchorDate(items: GanttSchedulableItem[]): Date {
  let anchor = defaultAnchorDate();
  for (const item of items) {
    if (!item.startsAt) continue;
    const leading = addWeeks(startOfDay(new Date(item.startsAt)), -2);
    if (leading < anchor) anchor = leading;
  }
  return anchor;
}

function tickStep(zoom: GanttZoom): { unit: "day" | "week" | "month"; step: number } {
  switch (zoom) {
    case "year":
      return { unit: "month", step: 1 };
    case "quarter":
      return { unit: "week", step: 2 };
    case "month":
      return { unit: "week", step: 1 };
    case "week":
      return { unit: "day", step: 1 };
  }
}

export function buildTicks(
  viewport: GanttViewport,
  formatLabel: (d: Date, zoom: GanttZoom) => GanttTick,
): GanttTick[] {
  const { start, end } = visibleRange(viewport);
  const { unit, step } = tickStep(viewport.zoom);
  const ticks: GanttTick[] = [];
  let cursor = startOfDay(start);

  while (cursor <= end) {
    const x = dateToX(cursor, viewport);
    if (x >= -120 && x <= viewport.viewportWidth + 120) {
      ticks.push(formatLabel(cursor, viewport.zoom));
    }
    if (unit === "day") cursor = addDays(cursor, step);
    else if (unit === "week") cursor = addWeeks(cursor, step);
    else cursor = addMonths(cursor, step);
  }

  return ticks;
}

export function defaultAnchorDate(): Date {
  return addMonths(startOfDay(new Date()), -6);
}

export function defaultChartEnd(anchor: Date): Date {
  return addYears(anchor, 2);
}

export function durationMs(startsAt: string, endsAt: string): number {
  return new Date(endsAt).getTime() - new Date(startsAt).getTime();
}

export function shiftDates(
  startsAt: string,
  endsAt: string,
  deltaDays: number,
): { startsAt: string; endsAt: string } {
  const start = addDays(new Date(startsAt), deltaDays);
  const end = addDays(new Date(endsAt), deltaDays);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function minBarWidthPx(zoom: GanttZoom): number {
  return pixelsPerDay(zoom);
}
