/** Mirrors button intents / variants — keep in sync with button-variant-classes.ts */
export const surfaceIntents = ["default", "primary", "brand", "secondary", "destructive", "warning"] as const;
export type SurfaceIntent = (typeof surfaceIntents)[number];

export const surfaceVariants = ["flat", "outline", "soft", "ghost", "text"] as const;
export type SurfaceVariant = (typeof surfaceVariants)[number];

/** srf + srf-{variant} + srf-{intent} */
export function srfClasses(variant: SurfaceVariant, intent: SurfaceIntent): string[] {
  return ["srf", `srf-${variant}`, `srf-${intent}`];
}

export type SurfaceModifiers = {
  /** Interactive surface — enables hover and :active styling */
  button?: boolean;
  /** Forced active appearance (selected chip, pressed toggle) */
  active?: boolean;
  elevated?: boolean;
};

export function srfModifiers(modifiers: SurfaceModifiers): string[] {
  const classes: string[] = [];
  if (modifiers.button) classes.push("srf-button");
  if (modifiers.active) classes.push("srf--active");
  if (modifiers.elevated) classes.push("srf--elevated");
  return classes;
}
