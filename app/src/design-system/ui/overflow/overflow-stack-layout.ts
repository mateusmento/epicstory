export function stackStridePx(diameterPx: number, overlapPx: number): number {
  return diameterPx - overlapPx;
}

/** Layout width for item at `itemIndex` in a stacked row (0 = full diameter, rest = stride). */
export function stackItemLayoutWidthPx(itemIndex: number, diameterPx: number, overlapPx: number): number {
  if (itemIndex <= 0) return diameterPx;
  const stride = stackStridePx(diameterPx, overlapPx);
  return stride > 0 ? stride : diameterPx;
}

/** Pixel width of all items in a stacked row (no ellipsis badge). */
export function stackedIntrinsicRowWidthPx(itemCount: number, diameterPx: number, overlapPx: number): number {
  if (itemCount <= 0) return 0;
  const stride = stackStridePx(diameterPx, overlapPx);
  if (stride <= 0) return diameterPx;
  return diameterPx + (itemCount - 1) * stride;
}

/** Pixel width of a stacked row showing `visibleCount` avatars (+ badge when truncated). */
export function stackedRowWidthPx(options: {
  total: number;
  visibleCount: number;
  itemWidthPx: number;
  overlapPx: number;
  overflowBadgeWidthPx: number;
}): number {
  const { total, visibleCount, itemWidthPx: d, overlapPx: o, overflowBadgeWidthPx: b } = options;
  const k = Math.max(0, Math.min(visibleCount, total));
  if (k <= 0) return 0;
  const w = stackedIntrinsicRowWidthPx(k, d, o);
  return k < total ? w + b : w;
}

/**
 * How many avatars fit in `containerWidth` (px), with an optional +N badge when truncated.
 * When `containerWidth` is 0, returns 0 (hide all).
 * If `total >= min` and fewer than `min` faces fit, returns 0 (hide entire stack).
 */
export function computeVisibleStackedItems(options: {
  containerWidth: number;
  total: number;
  itemWidthPx: number;
  overlapPx: number;
  overflowBadgeWidthPx: number;
  min: number;
}): number {
  const { containerWidth, total, itemWidthPx: d, overlapPx: o, overflowBadgeWidthPx: b, min } = options;
  if (containerWidth <= 0 || total <= 0) return 0;
  const stride = stackStridePx(d, o);
  if (stride <= 0) return 0;

  const widthFor = (k: number): number =>
    stackedRowWidthPx({
      total,
      visibleCount: k,
      itemWidthPx: d,
      overlapPx: o,
      overflowBadgeWidthPx: b,
    });

  let best = 0;
  for (let k = total; k >= 1; k--) {
    if (widthFor(k) <= containerWidth) {
      best = k;
      break;
    }
  }

  if (best === 0) return 0;
  if (total >= min && best < min) return 0;
  return best;
}
