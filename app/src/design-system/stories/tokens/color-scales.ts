/**
 * Palette anchors for OKLCH relative shade generation (color-scales.css).
 */

export type ColorScaleStep = {
  label: string;
  step: number;
};

export type ColorPalette = {
  name: string;
  cssVar: `--scale-${string}`;
  description: string;
  /** Semantic token this anchor maps to */
  tokenRef?: string;
};

/** Fixed OKLCH stop — even lightness steps, no relative anchor */
export type FixedScaleStep = {
  label: string;
  /** Full CSS color, e.g. oklch(92.9% 0.0096 255.5) */
  oklch: string;
  /** When set, this swatch is a known demo/product hex */
  demoHex?: string;
  /** ConnectIntegrationDemo / token reference */
  demoRole?: string;
};

/** ConnectIntegrationDemo border — Tailwind slate-200, canonical --border */
export const DEMO_BORDER_HEX = "#e2e8f0";

/**
 * Slate border ramp: even 7.65% OKLCH lightness steps (hue ≈255.5, low chroma).
 * #E2E8F0 is pinned at 200 (step +3) — not the 500 anchor (~70% L).
 */
export const slateBorderScale: FixedScaleStep[] = [
  { label: "950", oklch: "oklch(31.7% 0.0076 255.5)" },
  { label: "900", oklch: "oklch(39.3% 0.0086 255.5)" },
  { label: "800", oklch: "oklch(47.0% 0.0096 255.5)" },
  { label: "700", oklch: "oklch(54.6% 0.0106 255.5)" },
  { label: "600", oklch: "oklch(62.3% 0.0116 255.5)" },
  { label: "500", oklch: "oklch(69.9% 0.0126 255.5)" },
  { label: "400", oklch: "oklch(77.6% 0.0116 255.5)" },
  { label: "300", oklch: "oklch(85.2% 0.0106 255.5)" },
  {
    label: "200",
    oklch: "oklch(92.88% 0.0126 255.5)",
    demoHex: DEMO_BORDER_HEX,
    demoRole: "ConnectIntegrationDemo borders → --border",
  },
  { label: "100", oklch: "oklch(97.5% 0.0086 255.5)" },
  { label: "50", oklch: "oklch(98.5% 0.0076 255.5)" },
];

export const slateBorderScaleMeta = {
  name: "slate-border",
  description: "Even neutral slate ramp for borders and dividers. Demo border #E2E8F0 sits at 200.",
  lStep: "7.65%",
  anchorLabel: "500",
  anchorNote:
    "Mid ramp (~70% L) — lighter than typical UI anchors because the product border is a light tint.",
  tokenRef: "--slate-200",
  cssFile: "color-shades.css",
};

/** Dark (950) → light (50), step 0 = mid-tone anchor (500) */
export const colorScaleSteps: ColorScaleStep[] = [
  { label: "950", step: -5 },
  { label: "900", step: -4 },
  { label: "800", step: -3 },
  { label: "700", step: -2 },
  { label: "600", step: -1 },
  { label: "500", step: 0 },
  { label: "400", step: 1 },
  { label: "300", step: 2 },
  { label: "200", step: 3 },
  { label: "100", step: 4 },
  { label: "50", step: 5 },
];

export const colorPalettes: ColorPalette[] = [
  {
    name: "slate",
    cssVar: "--scale-slate",
    description: "Neutral slate — borders, surfaces, muted text",
    tokenRef: "--slate-500",
  },
  {
    name: "indigo",
    cssVar: "--scale-indigo",
    description: "Primary / brand / links — Tailwind indigo",
    tokenRef: "--indigo-500",
  },
  {
    name: "red",
    cssVar: "--scale-red",
    description: "Destructive actions — Tailwind red",
    tokenRef: "--red-500",
  },
  {
    name: "amber",
    cssVar: "--scale-amber",
    description: "Warning actions — Tailwind amber",
    tokenRef: "--amber-500",
  },
];

export const scaleFormula = `oklch(
  from var(--scale-base)
  calc(l + var(--step) * var(--scale-l-step))
  calc(max(0.005, c - abs(var(--step)) * var(--scale-c-step)))
  calc(h + var(--step) * var(--scale-h-step))
)`;

export const listItemFormula = `oklch(
  from var(--scale-base)
  calc(l - var(--i) * 0.05)
  calc(max(0.005, c - var(--i) * 0.01))
  calc(h - (var(--i) + 5))
)`;
