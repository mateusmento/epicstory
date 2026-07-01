import { srfClasses, type SurfaceIntent, type SurfaceVariant } from "../surface/surface-intent-classes";

export const buttonIntents = [
  "default",
  "primary",
  "brand",
  "secondary",
  "destructive",
  "warning",
  "success",
] as const;
export type ButtonIntent = SurfaceIntent;

export const buttonSurfaceVariants = ["flat", "outline", "soft", "ghost", "text"] as const;
export type ButtonSurfaceVariant = SurfaceVariant;

/** srf + srf-{variant} + srf-{intent} + srf--hover + srf--click */
export function btnClasses(variant: ButtonSurfaceVariant, intent: ButtonIntent): string[] {
  return [...srfClasses(variant, intent), "srf--hover", "srf--click"];
}
