export type DescriptionThreadLayoutInput = {
  id: number | string;
  /** Ideal top offset relative to the shared layout root (selection start Y). */
  idealTop: number;
  /** Measured card height (use estimate before mount). */
  height: number;
};

export type DescriptionThreadLayoutItem = {
  id: number | string;
  top: number;
};

/**
 * Place gutter cards at selection-start Y; stack only when they would overlap.
 * Inputs must already be sorted by selection start (document order).
 */
export function layoutDescriptionThreadCards(
  items: DescriptionThreadLayoutInput[],
  gap = 8,
): DescriptionThreadLayoutItem[] {
  let prevBottom = Number.NEGATIVE_INFINITY;
  return items.map((item) => {
    const top = Math.max(
      item.idealTop,
      prevBottom === Number.NEGATIVE_INFINITY ? item.idealTop : prevBottom + gap,
    );
    prevBottom = top + Math.max(0, item.height);
    return { id: item.id, top };
  });
}

/** Sort key helper: document position ascending, then createdAt. */
export function compareDescriptionThreadsByAnchor<T extends { anchorFrom: number; createdAt: string }>(
  a: T,
  b: T,
): number {
  if (a.anchorFrom !== b.anchorFrom) return a.anchorFrom - b.anchorFrom;
  return a.createdAt.localeCompare(b.createdAt);
}
