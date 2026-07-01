import { type VariantProps, cva } from "class-variance-authority";

export { default as Badge } from "./Badge.vue";
export * from "./badge-variant-classes";

export const badgeVariants = cva("inline-flex justify-center items-center w-fit rounded-md font-semibold", {
  variants: {
    size: {
      default: "px-2.5 py-0.5 text-xs",
      xs: "px-1 py-0 rounded-sm text-xs",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;
