import { type VariantProps, cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
    "transition-[background,border-color,box-shadow,color,background-image] duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        normal: "h-9 px-4 py-2 rounded-lg",
        xs: "h-7 px-2 rounded text-xs",
        sm: "h-8 px-2 rounded-md text-xs",
        lg: "h-10 px-8 rounded-xl",
        icon: "p-1 text-xs",
      },
    },
    defaultVariants: {
      size: "normal",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
