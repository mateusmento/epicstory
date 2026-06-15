/**
 * Canonical token metadata for Storybook reference stories (Phase 1 audit → Phase 2 docs).
 * Source of truth for values: main.css, tailwind.config.ts, component-colors.ts, ConnectIntegrationDemo.
 */

export type TokenStatus = "canonical" | "planned";

export type SemanticColorToken = {
  name: string;
  cssVar: `--${string}`;
  tailwindBg: string;
  tailwindText?: string;
  demoHex?: string;
  demoRole?: string;
  status?: TokenStatus;
};

export type DomainColorToken = {
  name: string;
  cssVar: `--${string}`;
  tailwindClass: string;
  demoRole?: string;
};

export type DemoColorMapping = {
  demoHex: string;
  demoRole: string;
  tokenProposal: string;
  status: TokenStatus;
};

export type SpacingToken = {
  name: string;
  rem: string;
  px: number;
  tailwindClass: string;
  scssMixin?: string;
};

export type RadiusToken = {
  name: string;
  value: string;
  source: "css-var" | "tailwind" | "demo";
  tailwindClass?: string;
  note?: string;
};

export type TypographySample = {
  label: string;
  className: string;
  sample: string;
  source: "main.css" | "tailwind.config" | "demo";
  note?: string;
};

export type ElevationToken = {
  name: string;
  tailwindUtility: string;
  demoKey: string;
  shadow: string;
  status: TokenStatus;
  usedOn?: string;
};

export type DeferredPattern = {
  id: string;
  title: string;
  description: string;
  demoSource: string;
  promoteWhen: string;
  previewStyle?: Record<string, string>;
  previewClass?: string;
};

/** shadcn-style semantic colors in main.css (:root / .dark) */
export const semanticColors: SemanticColorToken[] = [
  {
    name: "background",
    cssVar: "--background",
    tailwindBg: "bg-background",
    demoHex: "#f4f4f6",
    demoRole: "Page base",
  },
  {
    name: "foreground",
    cssVar: "--foreground",
    tailwindBg: "bg-foreground",
    tailwindText: "text-foreground",
    demoHex: "#0f172a",
    demoRole: "Headings",
  },
  {
    name: "primary",
    cssVar: "--primary",
    tailwindBg: "bg-primary",
    tailwindText: "text-primary-foreground",
    demoRole: "Neutral primary CTA (not brand blue)",
  },
  {
    name: "primary-foreground",
    cssVar: "--primary-foreground",
    tailwindBg: "bg-primary-foreground",
  },
  {
    name: "secondary",
    cssVar: "--secondary",
    tailwindBg: "bg-secondary",
    tailwindText: "text-secondary-foreground",
  },
  {
    name: "secondary-foreground",
    cssVar: "--secondary-foreground",
    tailwindBg: "bg-secondary-foreground",
  },
  {
    name: "muted",
    cssVar: "--muted",
    tailwindBg: "bg-muted",
    tailwindText: "text-muted-foreground",
    demoHex: "#f8fafc",
    demoRole: "Input prefix bg",
  },
  {
    name: "muted-foreground",
    cssVar: "--muted-foreground",
    tailwindBg: "bg-muted-foreground",
    demoHex: "#64748b",
    demoRole: "Secondary text",
  },
  {
    name: "accent",
    cssVar: "--accent",
    tailwindBg: "bg-accent",
    tailwindText: "text-accent-foreground",
  },
  {
    name: "accent-foreground",
    cssVar: "--accent-foreground",
    tailwindBg: "bg-accent-foreground",
    demoHex: "#334155",
    demoRole: "Labels",
  },
  {
    name: "destructive",
    cssVar: "--destructive",
    tailwindBg: "bg-destructive",
    tailwindText: "text-destructive-foreground",
  },
  {
    name: "destructive-foreground",
    cssVar: "--destructive-foreground",
    tailwindBg: "bg-destructive-foreground",
  },
  {
    name: "border",
    cssVar: "--border",
    tailwindBg: "bg-border",
    demoHex: "#e2e8f0",
    demoRole: "Borders / dividers",
  },
  {
    name: "input",
    cssVar: "--input",
    tailwindBg: "bg-input",
    demoHex: "#e2e8f0",
    demoRole: "Input borders",
  },
  {
    name: "ring",
    cssVar: "--ring",
    tailwindBg: "bg-ring",
  },
  {
    name: "card",
    cssVar: "--card",
    tailwindBg: "bg-card",
    tailwindText: "text-card-foreground",
  },
  {
    name: "card-foreground",
    cssVar: "--card-foreground",
    tailwindBg: "bg-card-foreground",
  },
  {
    name: "popover",
    cssVar: "--popover",
    tailwindBg: "bg-popover",
    tailwindText: "text-popover-foreground",
  },
  {
    name: "popover-foreground",
    cssVar: "--popover-foreground",
    tailwindBg: "bg-popover-foreground",
  },
];

/** Product domain tokens — main.css + component-colors.ts */
export const domainColors: DomainColorToken[] = [
  {
    name: "mention",
    cssVar: "--mention",
    tailwindClass: "text-mention",
    demoRole: "@user mention link color",
  },
  {
    name: "mention-chip",
    cssVar: "--mention-chip",
    tailwindClass: "bg-mention-chip",
    demoRole: "Mention chip background",
  },
  {
    name: "mention-highlight",
    cssVar: "--mention-highlight",
    tailwindClass: "bg-mentionHighlight",
    demoRole: "Current-user mention highlight",
  },
  {
    name: "code-block",
    cssVar: "--code-block",
    tailwindClass: "bg-codeBlock",
    demoRole: "Code block surface",
  },
  {
    name: "code-block-header",
    cssVar: "--code-block-header",
    tailwindClass: "bg-codeBlock-header",
  },
  {
    name: "code-block-shell",
    cssVar: "--code-block-shell",
    tailwindClass: "bg-codeBlock-shell",
  },
];

/** Brand tokens — planned for Phase 3; demo values documented here */
export const plannedBrandColors: SemanticColorToken[] = [
  {
    name: "brand",
    cssVar: "--brand",
    tailwindBg: "bg-brand",
    demoHex: "#5d5cff → #4a49e0",
    demoRole: "Brand CTA gradient base",
    status: "planned",
  },
  {
    name: "brand-border",
    cssVar: "--brand-border",
    tailwindBg: "border-brand-border",
    demoHex: "#3f3ec8",
    demoRole: "Brand button border",
    status: "planned",
  },
  {
    name: "link",
    cssVar: "--link",
    tailwindBg: "text-link",
    demoHex: "#6366f1",
    demoRole: "Inline links",
    status: "planned",
  },
];

/** ConnectIntegrationDemo Tier 1 hex → token mapping */
export const demoColorMappings: DemoColorMapping[] = [
  { demoHex: "#0f172a", demoRole: "Headings", tokenProposal: "--foreground", status: "canonical" },
  {
    demoHex: "#64748b",
    demoRole: "Secondary text",
    tokenProposal: "--muted-foreground",
    status: "canonical",
  },
  { demoHex: "#334155", demoRole: "Labels", tokenProposal: "--accent-foreground", status: "canonical" },
  {
    demoHex: "#94a3b8",
    demoRole: "Placeholders",
    tokenProposal: "--muted-foreground (extend)",
    status: "canonical",
  },
  { demoHex: "#e2e8f0", demoRole: "Borders", tokenProposal: "--border, --input", status: "canonical" },
  { demoHex: "#f8fafc", demoRole: "Input prefix bg", tokenProposal: "--muted", status: "canonical" },
  { demoHex: "#f4f4f6", demoRole: "Page base", tokenProposal: "--background", status: "canonical" },
  {
    demoHex: "#5d5cff → #4a49e0",
    demoRole: "Brand CTA",
    tokenProposal: "--brand, --brand-from/via/to",
    status: "planned",
  },
  { demoHex: "#3f3ec8", demoRole: "Brand border", tokenProposal: "--brand-border", status: "planned" },
  { demoHex: "#6366f1", demoRole: "Links", tokenProposal: "--link", status: "planned" },
];

/** Tailwind extend.spacing — matches variables.scss active block */
export const spacingScale: SpacingToken[] = [
  { name: "th", rem: "0.0625rem", px: 1, tailwindClass: "p-th", scssMixin: "flex:row-th" },
  { name: "sm", rem: "0.125rem", px: 2, tailwindClass: "p-sm", scssMixin: "flex:row-sm" },
  { name: "md", rem: "0.375rem", px: 6, tailwindClass: "p-md", scssMixin: "flex:row-md" },
  { name: "lg", rem: "0.5rem", px: 8, tailwindClass: "p-lg", scssMixin: "flex:row-lg" },
  { name: "xl", rem: "0.75rem", px: 12, tailwindClass: "p-xl", scssMixin: "flex:row-xl" },
  { name: "2xl", rem: "1rem", px: 16, tailwindClass: "p-2xl", scssMixin: "flex:row-2xl" },
  { name: "3xl", rem: "1.5rem", px: 24, tailwindClass: "p-3xl", scssMixin: "flex:row-3xl" },
  { name: "4xl", rem: "2rem", px: 32, tailwindClass: "p-4xl", scssMixin: "flex:row-4xl" },
  { name: "5xl", rem: "2.5rem", px: 40, tailwindClass: "p-5xl", scssMixin: "flex:row-5xl" },
  { name: "6xl", rem: "4rem", px: 64, tailwindClass: "p-6xl", scssMixin: "flex:row-6xl" },
  { name: "7xl", rem: "5rem", px: 80, tailwindClass: "p-7xl", scssMixin: "flex:row-7xl" },
  { name: "8xl", rem: "6rem", px: 96, tailwindClass: "p-8xl", scssMixin: "Tailwind only" },
];

export const radiusTokens: RadiusToken[] = [
  {
    name: "radius (default)",
    value: "0.5rem",
    source: "css-var",
    tailwindClass: "rounded-lg",
    note: "--radius in main.css",
  },
  { name: "sm", value: "0.250rem", source: "tailwind", tailwindClass: "rounded-sm" },
  { name: "default", value: "var(--radius)", source: "css-var", tailwindClass: "rounded-md" },
  {
    name: "card-lg (proposed)",
    value: "1.35rem",
    source: "demo",
    tailwindClass: "rounded-[1.35rem]",
    note: "ConnectIntegrationDemo card radius",
  },
  { name: "4xl", value: "2rem", source: "tailwind", tailwindClass: "rounded-4xl" },
  { name: "5xl", value: "2.5rem", source: "tailwind", tailwindClass: "rounded-5xl" },
  { name: "6xl", value: "4rem", source: "tailwind", tailwindClass: "rounded-6xl" },
  { name: "7xl", value: "5rem", source: "tailwind", tailwindClass: "rounded-7xl" },
  { name: "8xl", value: "6rem", source: "tailwind", tailwindClass: "rounded-8xl" },
];

export const fontFamilies = [
  { name: "body (main.css)", value: '"Inter", "Gabarito", "DM Sans"', source: "main.css" as const },
  { name: "font-lato", value: "Lato", source: "tailwind.config" as const },
  { name: "font-dmSans", value: "DM Sans", source: "tailwind.config" as const },
  { name: "font-inter", value: "Inter", source: "tailwind.config" as const },
  { name: "font-jakartaSans", value: "Plus Jakarta Sans", source: "tailwind.config" as const },
];

export const typographySamples: TypographySample[] = [
  {
    label: "text-lg / bold",
    className: "text-lg font-bold leading-[1.35]",
    sample: "Connect Tradier to Github",
    source: "demo",
    note: "Demo card title",
  },
  {
    label: "text-[0.8125rem] / semibold",
    className: "text-[0.8125rem] font-semibold",
    sample: "Account Name",
    source: "demo",
    note: "Form labels (13px)",
  },
  {
    label: "text-[0.8125rem] / normal",
    className: "text-[0.8125rem] leading-normal",
    sample: "Streamline your API requests…",
    source: "demo",
    note: "Secondary copy",
  },
  {
    label: "text-sm / medium",
    className: "text-sm font-medium",
    sample: "Cancel",
    source: "demo",
    note: "Button copy",
  },
  {
    label: "text-xs",
    className: "text-xs leading-[1.45]",
    sample: "The data used in this connection is public data only.",
    source: "demo",
  },
  {
    label: "text-sm (default scale)",
    className: "text-sm",
    sample: "Default Tailwind text-sm (14px)",
    source: "tailwind.config",
  },
  {
    label: "text-base",
    className: "text-base",
    sample: "Default body size (16px)",
    source: "tailwind.config",
  },
  {
    label: "font-medium",
    className: "text-base font-medium",
    sample: "Medium weight sample",
    source: "demo",
  },
  {
    label: "font-semibold",
    className: "text-base font-semibold",
    sample: "Semibold weight sample",
    source: "demo",
  },
  { label: "font-bold", className: "text-base font-bold", sample: "Bold weight sample", source: "demo" },
];

/** Tier 2 — demo shadows; Tailwind utilities planned for Phase 3 */
export const elevationTokens: ElevationToken[] = [
  {
    name: "card-elevated",
    tailwindUtility: "shadow-card-elevated",
    demoKey: "tokens.shadows.card",
    shadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 40px rgba(15, 23, 42, 0.1)",
    status: "planned",
    usedOn: "ConnectIntegrationDemo card",
  },
  {
    name: "btn-outline",
    tailwindUtility: "shadow-btn-outline",
    demoKey: "tokens.shadows.btnCancel",
    shadow: "0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.06)",
    status: "planned",
    usedOn: "Cancel button (outline variant)",
  },
  {
    name: "btn-outline-hover",
    tailwindUtility: "shadow-btn-outline-hover",
    demoKey: "tokens.shadows.btnCancelHover",
    shadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 3px 8px rgba(15, 23, 42, 0.08)",
    status: "planned",
    usedOn: "Cancel button hover",
  },
  {
    name: "btn-brand",
    tailwindUtility: "shadow-btn-brand",
    demoKey: "tokens.shadows.btnNext",
    shadow:
      "inset 0 0 1px 1px rgba(255, 255, 255, 0.5), 0 1px 0 rgba(63, 62, 200, 0.22), 0 2px 4px rgba(58, 57, 180, 0.4)",
    status: "planned",
    usedOn: "Next button (brand variant)",
  },
  {
    name: "btn-brand-hover",
    tailwindUtility: "shadow-btn-brand-hover",
    demoKey: "tokens.shadows.btnNextHover",
    shadow:
      "inset 0 0 1px 1px rgba(255, 255, 255, 0.52), 0 1px 0 rgba(63, 62, 200, 0.22), 0 3px 6px rgba(58, 57, 180, 0.28)",
    status: "planned",
    usedOn: "Next button hover",
  },
  {
    name: "btn-brand-active",
    tailwindUtility: "shadow-btn-brand-active",
    demoKey: "tokens.shadows.btnNextActive",
    shadow:
      "inset 0 1px 2px rgba(47, 46, 150, 0.35), 0 1px 0 rgba(63, 62, 200, 0.14), 0 1px 2px rgba(58, 57, 180, 0.4)",
    status: "planned",
    usedOn: "Next button active",
  },
];

/** Tier 3 — surface-specific patterns from ConnectIntegrationDemo; not global :root tokens */
export const deferredPatterns: DeferredPattern[] = [
  {
    id: "page-chrome",
    title: "Page chrome (4-layer radial background)",
    description: "Multi-layer radial gradients for marketing / wizard shells. Not suitable for global :root.",
    demoSource: "tokens.gradients.pageBackground",
    promoteWhen: "3+ surfaces reuse (auth/wizard shell — task 10)",
    previewStyle: {
      background:
        "radial-gradient(ellipse 85% 65% at 18% 92%, rgba(255, 186, 148, 0.55) 0%, transparent 58%), " +
        "radial-gradient(ellipse 75% 55% at 82% 88%, rgba(147, 197, 253, 0.5) 0%, transparent 55%), " +
        "radial-gradient(ellipse 90% 70% at 50% 8%, rgba(237, 233, 254, 0.75) 0%, transparent 60%), " +
        "radial-gradient(ellipse 60% 45% at 65% 35%, rgba(254, 215, 170, 0.25) 0%, transparent 50%), " +
        "#f4f4f6",
    },
  },
  {
    id: "grid-overlay",
    title: "Grid overlay with elliptical mask fade",
    description:
      "Linear grid + mask-image elliptical fade. Tailwind cannot express mask-image; keep in layout CSS.",
    demoSource: "tokens.gradients.gridImage + tokens.gradients.gridMask",
    promoteWhen: "Shared wizard / marketing layout component",
    previewStyle: {
      backgroundImage:
        "linear-gradient(rgba(0, 0, 0, 0.035) 1px, transparent 1px), " +
        "linear-gradient(90deg, rgba(0, 0, 0, 0.035) 1px, transparent 1px)",
      backgroundSize: "3rem 3rem",
      WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 100%)",
      maskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 100%)",
    },
  },
  {
    id: "frosted-footer",
    title: "Frosted footer panel",
    description: "Semi-transparent white + backdrop-blur for card footers.",
    demoSource: "styles.footer",
    promoteWhen: "Card / dialog footer pattern reused 3+ times",
    previewStyle: {
      background: "rgba(255, 255, 255, 0.38)",
      backdropFilter: "blur(14px)",
    },
    previewClass: "border border-black/8 rounded-lg px-4 py-3",
  },
  {
    id: "brand-tradier",
    title: "Third-party brand tile (Tradier)",
    description: "Integration-specific gradient — not Epicstory brand. Do not promote to global tokens.",
    demoSource: "tokens.gradients.brandTradier",
    promoteWhen: "Never — integration-specific",
    previewStyle: {
      background: "linear-gradient(180deg, #5b8ba2 0%, #4a768d 100%)",
    },
    previewClass: "size-14 rounded-xl border border-white/55",
  },
];
