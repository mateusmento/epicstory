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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          border: "hsl(var(--brand-border) / <alpha-value>)",
        },
        link: "hsl(var(--link) / <alpha-value>)",
        codeBlock: {
          DEFAULT: "hsl(var(--code-block))",
          header: "hsl(var(--code-block-header))",
          shell: "hsl(var(--code-block-shell))",
          gutter: "hsl(var(--code-block-gutter))",
        },
        ...componentColors,
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(180deg, hsl(var(--brand-from)) 0%, hsl(var(--brand-via)) 52%, hsl(var(--brand-to)) 100%)",
        "brand-gradient-hover":
          "linear-gradient(180deg, hsl(240 100% 70%) 0%, hsl(240 88% 65%) 52%, hsl(240 78% 60%) 100%)",
        "brand-gradient-active":
          "linear-gradient(180deg, hsl(var(--brand-via)) 0%, hsl(var(--brand-to)) 100%)",
      },
      boxShadow: {
        "btn-outline": "0 1px 2px rgb(15 23 42 / 0.05), 0 2px 6px rgb(15 23 42 / 0.06)",
        "btn-outline-hover": "0 1px 2px rgb(15 23 42 / 0.06), 0 3px 8px rgb(15 23 42 / 0.08)",
        "btn-outline-active": "0 1px 2px rgb(15 23 42 / 0.05)",
        "btn-brand":
          "inset 0 0 1px 1px rgb(255 255 255 / 0.5), 0 1px 0 rgb(63 62 200 / 0.22), 0 2px 4px rgb(58 57 180 / 0.4)",
        "btn-brand-hover":
          "inset 0 0 1px 1px rgb(255 255 255 / 0.52), 0 1px 0 rgb(63 62 200 / 0.22), 0 3px 6px rgb(58 57 180 / 0.28)",
        "btn-brand-active":
          "inset 0 1px 2px rgb(47 46 150 / 0.35), 0 1px 0 rgb(63 62 200 / 0.14), 0 1px 2px rgb(58 57 180 / 0.4)",
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
