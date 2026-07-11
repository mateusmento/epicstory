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

function packForward(
  items: DescriptionThreadLayoutInput[],
  gap: number,
  startBottom = Number.NEGATIVE_INFINITY,
): DescriptionThreadLayoutItem[] {
  let prevBottom = startBottom;
  return items.map((item) => {
    const top = Math.max(
      item.idealTop,
      prevBottom === Number.NEGATIVE_INFINITY ? item.idealTop : prevBottom + gap,
    );
    prevBottom = top + Math.max(0, item.height);
    return { id: item.id, top };
  });
}

/**
 * Place gutter cards at selection-start Y; stack only when they would overlap.
 * Inputs must already be sorted by selection start (document order).
 *
 * When `activeId` is set: pin that card at its idealTop, then only push the
 * contiguous run of neighbors that actually overlap it (Linear locality).
 * Distant cards keep their default forward-pack positions — no global roll-up
 * that collapses the gutter into a top stack + empty void.
 */
export function layoutDescriptionThreadCards(
  items: DescriptionThreadLayoutInput[],
  gap = 8,
  activeId?: number | string | null,
): DescriptionThreadLayoutItem[] {
  if (items.length === 0) return [];

  const activeIndex = activeId == null ? -1 : items.findIndex((item) => item.id === activeId);

  if (activeIndex < 0) {
    return packForward(items, gap);
  }

  const result = packForward(items, gap);
  const active = items[activeIndex]!;
  const activeTop = Math.max(0, active.idealTop);
  result[activeIndex] = { id: active.id, top: activeTop };

  // Push later overlapping cards down; stop at the first that already clears.
  for (let i = activeIndex + 1; i < items.length; i++) {
    const prev = result[i - 1]!;
    const prevH = Math.max(0, items[i - 1]!.height);
    const minTop = prev.top + prevH + gap;
    if (result[i]!.top >= minTop) break;
    result[i] = { id: items[i]!.id, top: minTop };
  }

  // Push earlier overlapping cards up; stop at the first that already clears.
  for (let i = activeIndex - 1; i >= 0; i--) {
    const next = result[i + 1]!;
    const h = Math.max(0, items[i]!.height);
    const maxTop = next.top - h - gap;
    if (result[i]!.top <= maxTop) break;
    result[i] = { id: items[i]!.id, top: maxTop };
  }

  return result;
}

/** Sort key helper: document position ascending, then createdAt. */
export function compareDescriptionThreadsByAnchor<T extends { anchorFrom: number; createdAt: string }>(
  a: T,
  b: T,
): number {
  if (a.anchorFrom !== b.anchorFrom) return a.anchorFrom - b.anchorFrom;
  return a.createdAt.localeCompare(b.createdAt);
}
