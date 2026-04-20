export const componentColors = {
  button: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  dropdown: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  drawer: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  unseenMessageCount: {
    DEFAULT: "var(--dark-blue)",
    foreground: "hsl(var(--primary-foreground))",
  },
  /** @user mentions: chip background + link-colored text (non-self uses `chip`; self uses `mentionHighlight`) */
  mention: {
    DEFAULT: "#1264a3",
    chip: "#e3f0ff",
  },
  /** @current-user highlight chip */
  mentionHighlight: {
    DEFAULT: "#fff8e1",
    /** Warm brown — reads on cream without harsh black */
    foreground: "#6b5220",
  },
};
