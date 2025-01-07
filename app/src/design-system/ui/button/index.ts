import { type VariantProps, cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-transperent shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        normal: "h-9 px-4 py-2",
        xs: "h-7 rounded px-2",
        sm: "rounded-md px-2 py-1.5 text-xs justify-start",
        lg: "h-10 rounded-md px-8",
        icon: "p-1",
        badge: "py-0.5 px-1 rounded text-xs",
      },
    },
    compoundVariants: [{}],
    defaultVariants: {
      variant: "default",
      size: "normal",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
