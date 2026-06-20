import { type VariantProps, cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
    "transition-[background,box-shadow,color] duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        brand: [
          "rounded-xl border border-brand-border bg-brand-gradient text-white font-semibold tracking-[-0.01em]",
          "shadow-btn-brand hover:bg-brand-gradient-hover hover:shadow-btn-brand-hover",
          "active:bg-brand-gradient-active active:shadow-btn-brand-active",
        ].join(" "),
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: [
          "rounded-lg border border-gray-200 bg-white text-gray-700 font-medium shadow-btn-outline",
          "hover:bg-neutral-50 hover:shadow-btn-outline-hover active:shadow-btn-outline-active",
          "dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent",
        ].join(" "),
        secondary: "bg-secondary text-secondary-foreground font-semibold shadow-sm hover:bg-secondary/80",
        ghost: "font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        normal: "h-9 px-4 py-2",
        xs: "h-7 rounded px-2 text-xs",
        sm: "h-8 rounded-md px-2 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "p-1",
        "icon-sm": "p-0.5",
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
