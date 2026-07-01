/** Mirrors button intents / variants — keep in sync with button-variant-classes.ts */
export const surfaceIntents = [
  "default",
  "primary",
  "brand",
  "secondary",
  "destructive",
  "warning",
  "success",
] as const;
export type SurfaceIntent = (typeof surfaceIntents)[number];

export const surfaceVariants = ["flat", "outline", "soft", "ghost", "text"] as const;
export type SurfaceVariant = (typeof surfaceVariants)[number];

/** srf + srf-{variant} + srf-{intent} */
export function srfClasses(variant: SurfaceVariant, intent: SurfaceIntent): string[] {
  return ["srf", `srf-${variant}`, `srf-${intent}`];
}

export type SurfaceModifiers = {
  /** Interactive surface — enables hover and :active styling */
  click?: boolean;
  hover?: boolean;
  elevated?: boolean;
};

export function srfModifiers(modifiers: SurfaceModifiers): string[] {
  const classes: string[] = [];
  if (modifiers.click) classes.push("srf--click");
  if (modifiers.hover) classes.push("srf--hover");
  if (modifiers.elevated) classes.push("srf--elevated");
  return classes;
}
