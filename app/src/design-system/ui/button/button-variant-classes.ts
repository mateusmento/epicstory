import { srfClasses, type SurfaceIntent, type SurfaceVariant } from "../surface/surface-intent-classes";

export const buttonIntents = ["default", "primary", "brand", "secondary", "destructive", "warning"] as const;
export type ButtonIntent = SurfaceIntent;

export const buttonSurfaceVariants = ["flat", "outline", "soft", "ghost", "text"] as const;
export type ButtonSurfaceVariant = SurfaceVariant;

/** srf + srf-{variant} + srf-{intent} + srf-button */
export function btnClasses(variant: ButtonSurfaceVariant, intent: ButtonIntent): string[] {
  return [...srfClasses(variant, intent), "srf-button"];
}
