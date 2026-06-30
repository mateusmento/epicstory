export const componentColors = {
  button: {
    DEFAULT: "oklch(var(--accent) / <alpha-value>)",
    foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
  },
  dropdown: {
    DEFAULT: "oklch(var(--popover) / <alpha-value>)",
    foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
  },
  drawer: {
    DEFAULT: "oklch(var(--card) / <alpha-value>)",
    foreground: "oklch(var(--card-foreground) / <alpha-value>)",
  },
  unseenMessageCount: {
    DEFAULT: "var(--dark-blue)",
    foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
  },
  /** @user mentions: chip background + link-colored text (non-self uses `chip`; self uses `mentionHighlight`) */
  mention: {
    DEFAULT: "oklch(var(--mention) / <alpha-value>)",
    chip: "oklch(var(--mention-chip) / <alpha-value>)",
  },
  /** @current-user highlight chip */
  mentionHighlight: {
    DEFAULT: "oklch(var(--mention-highlight) / <alpha-value>)",
    foreground: "oklch(var(--mention-highlight-foreground) / <alpha-value>)",
  },
};
