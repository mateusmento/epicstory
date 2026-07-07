import { format } from "date-fns";
import type { GanttZoom } from "./types";
import type { GanttTick } from "./types";

export function formatHeaderTick(date: Date, zoom: GanttZoom): GanttTick {
  const x = 0;
  switch (zoom) {
    case "year":
      return { x, label: format(date, "MMM yyyy") };
    case "quarter":
      return { x, label: format(date, "MMM d"), subLabel: format(date, "EEE") };
    case "month":
      return { x, label: format(date, "MMM d") };
    case "week":
      return { x, label: format(date, "EEE"), subLabel: format(date, "d") };
  }
}

export function formatHeaderTickWithX(date: Date, zoom: GanttZoom, x: number): GanttTick {
  const tick = formatHeaderTick(date, zoom);
  return { ...tick, x };
}
