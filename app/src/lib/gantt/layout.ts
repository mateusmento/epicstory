import {
  GANTT_BAR_HEIGHT,
  GANTT_GROUP_HEADER_HEIGHT,
  GANTT_ROW_HEIGHT,
  dateToX,
  minBarWidthPx,
} from "./scale";
import type { GanttBarLayout, GanttGroupInput, GanttItemInput, GanttRowLayout, GanttViewport } from "./types";

export function layoutRows(groups: GanttGroupInput[], items: GanttItemInput[]): GanttRowLayout[] {
  const rows: GanttRowLayout[] = [];
  let y = 0;
  let rowIndex = 0;

  for (const group of groups) {
    y += GANTT_GROUP_HEADER_HEIGHT;
    const groupItems = items.filter((item) => item.groupId === group.id);
    for (const item of groupItems) {
      rows.push({
        itemId: item.id,
        groupId: group.id,
        rowIndex,
        y,
        height: GANTT_ROW_HEIGHT,
      });
      y += GANTT_ROW_HEIGHT;
      rowIndex += 1;
    }
  }

  return rows;
}

export function layoutBars(
  items: GanttItemInput[],
  rowLayouts: GanttRowLayout[],
  viewport: GanttViewport,
): GanttBarLayout[] {
  const rowByItem = new Map(rowLayouts.map((row) => [row.itemId, row]));
  const bars: GanttBarLayout[] = [];

  for (const item of items) {
    if (!item.startsAt || !item.endsAt) continue;
    const row = rowByItem.get(item.id);
    if (!row) continue;

    const startX = dateToX(item.startsAt, viewport);
    const endX = dateToX(item.endsAt, viewport);
    const width = Math.max(minBarWidthPx(viewport.zoom), endX - startX);

    bars.push({
      itemId: item.id,
      rowIndex: row.rowIndex,
      x: startX,
      width,
      y: row.y + (GANTT_ROW_HEIGHT - GANTT_BAR_HEIGHT) / 2,
      height: GANTT_BAR_HEIGHT,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    });
  }

  return bars;
}

export function chartContentHeight(groups: GanttGroupInput[], items: GanttItemInput[]): number {
  const groupHeaders = groups.length * GANTT_GROUP_HEADER_HEIGHT;
  const itemRows = items.length * GANTT_ROW_HEIGHT;
  return groupHeaders + itemRows;
}

export function rowAtY(
  y: number,
  groups: GanttGroupInput[],
  items: GanttItemInput[],
): { itemId: string; rowIndex: number } | null {
  let cursorY = 0;
  let rowIndex = 0;

  for (const group of groups) {
    cursorY += GANTT_GROUP_HEADER_HEIGHT;
    const groupItems = items.filter((item) => item.groupId === group.id);
    for (const item of groupItems) {
      if (y >= cursorY && y < cursorY + GANTT_ROW_HEIGHT) {
        return { itemId: item.id, rowIndex };
      }
      cursorY += GANTT_ROW_HEIGHT;
      rowIndex += 1;
    }
  }

  return null;
}
