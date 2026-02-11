import { type VariantProps, cva } from "class-variance-authority";

export { default as Toggle } from "./Toggle.vue";

export const toggleVariants = cva(
  [
    "inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none",
    "focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    "",
  ],
  {
    variants: {
      variant: {
        default: "bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        outline: [
          "bg-transparent border border-transparent hover:data-[state=off]:bg-muted hover:data-[state=off]:text-muted-foreground",
          "data-[state=on]:border-input data-[state=on]:shadow-sm",
        ],
      },
      size: {
        default: "h-9 px-3",
        sm: "h-7 px-2",
        lg: "h-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ToggleVariants = VariantProps<typeof toggleVariants>;
