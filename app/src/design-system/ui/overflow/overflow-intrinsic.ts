import type { OverflowSegment } from "./overflow-layout";

export function rowWidthPx(segments: { widthPx: number }[], gapPx: number): number {
  if (segments.length === 0) return 0;
  const sum = segments.reduce((acc, segment) => acc + segment.widthPx, 0);
  return sum + (segments.length - 1) * gapPx;
}

/** Sum of all item segment natural widths (ellipsis excluded unless reserved). */
export function intrinsicRowWidthPx(
  segments: OverflowSegment[],
  gapPx: number,
  options: { ellipsisReservePx?: number } = {},
): number {
  const items = segments.filter((segment) => segment.kind === "item");
  const itemsWidth = rowWidthPx(items, gapPx);
  const hasEllipsis = segments.some((segment) => segment.kind === "ellipsis");
  if (!hasEllipsis) return itemsWidth;
  if (items.length === 0) return options.ellipsisReservePx ?? 0;
  const reserve = options.ellipsisReservePx ?? 0;
  return itemsWidth + gapPx + reserve;
}
