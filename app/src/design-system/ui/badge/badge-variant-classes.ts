import { srfClasses, type SurfaceIntent, type SurfaceVariant } from "../surface/surface-intent-classes";

export const badgeIntents = [
  "default",
  "primary",
  "brand",
  "secondary",
  "destructive",
  "warning",
  "success",
] as const;
export type BadgeIntent = SurfaceIntent;

export const badgeSurfaceVariants = ["flat", "outline", "soft", "ghost", "text"] as const;
export type BadgeSurfaceVariant = SurfaceVariant;

/** srf + srf-{variant} + srf-{intent} — static surface, no hover/click modifiers */
export function badgeClasses(variant: BadgeSurfaceVariant, intent: BadgeIntent): string[] {
  return srfClasses(variant, intent);
}
