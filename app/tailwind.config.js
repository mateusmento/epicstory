import animate from "tailwindcss-animate";

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
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "4rem",
        "7xl": "5rem",
        "8xl": "6rem",
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
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
  plugins: [animate],
};
