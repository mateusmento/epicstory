import animate from "tailwindcss-animate";
import container from "@tailwindcss/container-queries";
import { componentColors } from "./component-colors";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",

  content: [
    "./pages/**/*.{ts,tsx,vue}",
    "./components/**/*.{ts,tsx,vue}",
    "./app/**/*.{ts,tsx,vue}",
    "./src/**/*.{ts,tsx,vue}",
    "../packages/tiptap/src/**/*.css",
  ],

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      lato: ["Lato"],
      dmSans: ["DM Sans"],
      jakartaSans: ["Plus Jakarta Sans"],
      inter: ["Inter"],
    },
    extend: {
      spacing: {
        th: "0.0625rem",
        sm: ".125rem",
        md: ".375rem",
        lg: ".5rem",
        xl: ".75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "4rem",
        "7xl": "5rem",
        "8xl": "6rem",
      },
      borderRadius: {
        sm: "0.250rem",
        "card-lg": "1.35rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "4rem",
        "7xl": "5rem",
        "8xl": "6rem",
      },
      colors: {
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
          border: "oklch(var(--destructive-border) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "oklch(var(--brand) / <alpha-value>)",
          border: "oklch(var(--brand-border) / <alpha-value>)",
        },
        link: "oklch(var(--link) / <alpha-value>)",
        codeBlock: {
          DEFAULT: "oklch(var(--code-block) / <alpha-value>)",
          header: "oklch(var(--code-block-header) / <alpha-value>)",
          shell: "oklch(var(--code-block-shell) / <alpha-value>)",
          gutter: "oklch(var(--code-block-gutter) / <alpha-value>)",
        },
        ...componentColors,
        chart: {
          "1": "oklch(var(--chart-1) / <alpha-value>)",
          "2": "oklch(var(--chart-2) / <alpha-value>)",
          "3": "oklch(var(--chart-3) / <alpha-value>)",
          "4": "oklch(var(--chart-4) / <alpha-value>)",
          "5": "oklch(var(--chart-5) / <alpha-value>)",
        },
      },
      backgroundImage: {},
      boxShadow: {
        "btn-outline": "0 1px 2px rgb(15 23 42 / 0.05), 0 2px 6px rgb(15 23 42 / 0.06)",
        "btn-outline-hover": "0 1px 2px rgb(15 23 42 / 0.06), 0 3px 8px rgb(15 23 42 / 0.08)",
        "btn-outline-active": "0 1px 2px rgb(15 23 42 / 0.05)",
        "card-elevated": "0 1px 2px rgb(15 23 42 / 0.04), 0 12px 40px rgb(15 23 42 / 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-vertically-show": {
          from: { height: 0 },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-vertically-hide": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: 0 },
        },
        "collapsible-horizontally-show": {
          from: { width: 0, transform: "scale(0.99)", opacity: 0 },
          "50%": { transform: "scale(0.99)", opacity: 0 },
          to: { width: "var(--radix-collapsible-content-width)", transform: "scale(1)", opacity: 1 },
        },
        "collapsible-horizontally-hide": {
          from: { width: "var(--radix-collapsible-content-width)", transform: "scale(1)", opacity: 1 },
          "50%": { transform: "scale(0.99)", opacity: 0 },
          to: { width: 0, transform: "scale(0.99)", opacity: 0 },
        },
        "collapsible-fadeout": {
          from: { transform: "scale(1)", opacity: 1 },
          to: { transform: "scale(0.99)", opacity: 0 },
        },
        "collapsible-fadein": {
          from: { transform: "scale(0.99)", opacity: 0 },
          to: { transform: "scale(1)", opacity: 1 },
        },
        fadeout: {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        fadein: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-vertically-show": "collapsible-vertically-show 0.2s ease-in-out",
        "collapsible-vertically-hide": "collapsible-vertically-hide 0.2s ease-in-out",
        "collapsible-horizontally-show": "collapsible-horizontally-show .2s ease-in-out",
        "collapsible-horizontally-hide": "collapsible-horizontally-hide .2s ease-in-out",
        "collapsible-fadein": "collapsible-fadein .2s ease-in-out",
        "collapsible-fadeout": "collapsible-fadeout .2s ease-in-out",
        fadein: "fadein .2s ease-in-out",
        fadeout: "fadeout .2s ease-in-out",
      },
    },
  },
  plugins: [animate, container, require("tailwindcss-animate")],
};
