export type OverflowSegmentKind = "item" | "ellipsis";

export type OverflowSegment = {
  kind: OverflowSegmentKind;
  widthPx: number;
  pinned?: boolean;
};

export type OverflowLayoutResult = {
  /** Per-segment visibility (ellipsis entry follows `showEllipsis`). */
  visible: boolean[];
  showEllipsis: boolean;
  hiddenCount: number;
  hiddenBefore: number;
  hiddenAfter: number;
  collapsed: boolean;
};

function rowWidth(segments: OverflowSegment[], visible: boolean[], gapPx: number): number {
  let segmentCount = 0;
  let sum = 0;

  for (let i = 0; i < segments.length; i++) {
    if (!visible[i]) continue;
    sum += segments[i].widthPx;
    segmentCount++;
  }

  if (segmentCount <= 0) return 0;
  return sum + (segmentCount - 1) * gapPx;
}

function findEllipsisIndex(segments: OverflowSegment[]): number {
  return segments.findIndex((segment) => segment.kind === "ellipsis");
}

function canHide(index: number, segments: OverflowSegment[], visible: boolean[]): boolean {
  const segment = segments[index];
  return visible[index] && segment.kind === "item" && !segment.pinned;
}

function hideLeftmost(indices: number[], segments: OverflowSegment[], visible: boolean[]): boolean {
  const index = indices.find((candidate) => canHide(candidate, segments, visible));
  if (index === undefined) return false;
  visible[index] = false;
  return true;
}

function hideRightmost(indices: number[], segments: OverflowSegment[], visible: boolean[]): boolean {
  const index = [...indices].reverse().find((candidate) => canHide(candidate, segments, visible));
  if (index === undefined) return false;
  visible[index] = false;
  return true;
}

/**
 * Given measured segment widths and container width, decide which segments are visible.
 *
 * - Ellipsis at the **end**: collapse the left group with `hideRightmost` (items adjacent to ⋯ first).
 * - Ellipsis at the **start**: collapse the right group with `hideLeftmost` (items adjacent to ⋯ first).
 * - Ellipsis in the **middle**: hide from outer edges of each side inward (breadcrumb-style).
 * - Without an ellipsis segment: truncates from the trailing edge.
 */
export function computeOverflowLayout(options: {
  containerWidthPx: number;
  gapPx: number;
  segments: OverflowSegment[];
}): OverflowLayoutResult {
  const { containerWidthPx, gapPx, segments } = options;
  const n = segments.length;

  const empty = (): OverflowLayoutResult => ({
    visible: segments.map(() => false),
    showEllipsis: false,
    hiddenCount: 0,
    hiddenBefore: 0,
    hiddenAfter: 0,
    collapsed: false,
  });

  if (n === 0 || containerWidthPx <= 0) return empty();

  const ellipsisIndex = findEllipsisIndex(segments);
  const hasEllipsis = ellipsisIndex >= 0;

  const itemIndices = segments
    .map((segment, index) => (segment.kind === "item" ? index : -1))
    .filter((index) => index >= 0);

  if (!hasEllipsis) {
    const visible = segments.map((segment) => segment.kind === "item");
    const leftIndices = [...itemIndices];

    while (
      leftIndices.some((index) => visible[index]) &&
      rowWidth(segments, visible, gapPx) > containerWidthPx
    ) {
      if (!hideRightmost(leftIndices, segments, visible)) break;
    }

    const hiddenCount = itemIndices.filter((index) => !visible[index]).length;
    return {
      visible,
      showEllipsis: false,
      hiddenCount,
      hiddenBefore: 0,
      hiddenAfter: hiddenCount,
      collapsed: hiddenCount > 0,
    };
  }

  const leftIndices = itemIndices.filter((index) => index < ellipsisIndex);
  const rightIndices = itemIndices.filter((index) => index > ellipsisIndex);
  const ellipsisAtStart = leftIndices.length === 0;
  const ellipsisAtEnd = rightIndices.length === 0;

  const visible = segments.map((segment) => segment.kind === "item");
  visible[ellipsisIndex] = false;

  const allItemsWidth = rowWidth(
    segments,
    segments.map((segment) => segment.kind === "item"),
    gapPx,
  );

  if (allItemsWidth <= containerWidthPx) {
    return {
      visible,
      showEllipsis: false,
      hiddenCount: 0,
      hiddenBefore: 0,
      hiddenAfter: 0,
      collapsed: false,
    };
  }

  visible[ellipsisIndex] = true;
  let hideFromLeft = true;

  const visibleLeftCount = () => leftIndices.filter((index) => visible[index]).length;
  const visibleRightCount = () => rightIndices.filter((index) => visible[index]).length;

  while (rowWidth(segments, visible, gapPx) > containerWidthPx) {
    const leftCount = visibleLeftCount();
    const rightCount = visibleRightCount();

    if (leftCount === 0 && rightCount === 0) break;

    let hid = false;

    if (ellipsisAtEnd && leftCount > 0) {
      hid = hideRightmost(leftIndices, segments, visible);
    } else if (ellipsisAtStart && rightCount > 0) {
      hid = hideLeftmost(rightIndices, segments, visible);
    } else if (leftCount > rightCount) {
      hid = hideLeftmost(leftIndices, segments, visible);
    } else if (rightCount > leftCount) {
      hid = hideRightmost(rightIndices, segments, visible);
    } else if (leftCount > 0 && rightCount > 0) {
      hid = hideFromLeft
        ? hideLeftmost(leftIndices, segments, visible)
        : hideRightmost(rightIndices, segments, visible);
      hideFromLeft = !hideFromLeft;
    } else if (leftCount > 0) {
      hid = hideRightmost(leftIndices, segments, visible);
    } else {
      hid = hideLeftmost(rightIndices, segments, visible);
    }

    if (!hid) break;
  }

  const hiddenBefore = leftIndices.filter((index) => !visible[index]).length;
  const hiddenAfter = rightIndices.filter((index) => !visible[index]).length;
  const hiddenCount = hiddenBefore + hiddenAfter;

  if (hiddenCount === 0) {
    visible[ellipsisIndex] = false;
  }

  return {
    visible,
    showEllipsis: hiddenCount > 0,
    hiddenCount,
    hiddenBefore,
    hiddenAfter,
    collapsed: hiddenCount > 0,
  };
}
