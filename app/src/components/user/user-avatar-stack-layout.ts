import type { UserAvatarSize } from "./user-avatar.types";

/** Tailwind `w-*` → px at default theme (1 = 4px). */
const DIAMETER_PX: Record<UserAvatarSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  mdLg: 28,
  base: 32,
  lg: 40,
  xl: 44,
  "2xl": 48,
  "3xl": 56,
  tile: 64,
  tileLg: 80,
  tileXl: 128,
};

/** Default negative overlap between stacked circles (matches typical `-ml-3` / `-ml-4` stacks). */
const DEFAULT_OVERLAP_PX: Record<UserAvatarSize, number> = {
  xs: 8,
  sm: 8,
  md: 12,
  mdLg: 12,
  base: 14,
  lg: 16,
  xl: 16,
  "2xl": 16,
  "3xl": 18,
  tile: 20,
  tileLg: 24,
  tileXl: 32,
};

export function userAvatarDiameterPx(size: UserAvatarSize): number {
  return DIAMETER_PX[size];
}

export function defaultStackOverlapPx(size: UserAvatarSize): number {
  return DEFAULT_OVERLAP_PX[size];
}

/**
 * How many avatars fit in `containerWidth` (px), with an optional +N badge when truncated.
 * When `containerWidth` is 0, returns 0 (hide all).
 * If `total >= min` and fewer than `min` faces fit, returns 0 (hide entire stack).
 */
export function computeVisibleStackedAvatars(options: {
  containerWidth: number;
  total: number;
  itemWidthPx: number;
  overlapPx: number;
  overflowBadgeWidthPx: number;
  min: number;
}): number {
  const { containerWidth, total, itemWidthPx: d, overlapPx: o, overflowBadgeWidthPx: b, min } = options;
  if (containerWidth <= 0 || total <= 0) return 0;
  const stride = d - o;
  if (stride <= 0) return 0;

  const widthFor = (k: number): number => {
    if (k <= 0) return 0;
    const capped = Math.min(k, total);
    const w = d + (capped - 1) * stride;
    return capped < total ? w + b : w;
  };

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
