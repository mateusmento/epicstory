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
  "2xl": 36,
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
