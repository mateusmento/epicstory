export const buttonColors = ["default", "primary", "secondary", "destructive", "warning", "gray"] as const;
export type ButtonColor = (typeof buttonColors)[number];

export const buttonSurfaceVariants = [
  "flat",
  "outline",
  "surface",
  "soft",
  "ghost",
  "text",
  "brand",
] as const;
export type ButtonSurfaceVariant = (typeof buttonSurfaceVariants)[number];
