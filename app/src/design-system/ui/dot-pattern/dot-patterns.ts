export type DotTone = "light" | "mid" | "dark";

export const DEFAULT_DOT_PATTERN_ROWS = 10;
export const DEFAULT_DOT_PATTERN_COLS = 12;

export type DotPatternId =
  | "scatter"
  | "scatter-soft"
  | "scatter-rich"
  | "scatter-heavy"
  | "scatter-speckled"
  | "diagonal"
  | "radial"
  | "corners"
  | "noise"
  | "ripple";

export type DotPatternDefinition = {
  label: string;
  grid: DotTone[][];
};

type ScatterFill = {
  light: number;
  mid: number;
  dark: number;
  seed: number;
};

function grid(rows: number, cols: number, cell: (row: number, col: number) => DotTone): DotTone[][] {
  return Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => cell(row, col)));
}

function fitAccentMask(template: (DotTone | null)[][], rows: number, cols: number): (DotTone | null)[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => template[row]?.[col] ?? null),
  );
}

function fitGrid(gridData: DotTone[][], rows: number, cols: number, fill: DotTone = "light"): DotTone[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => gridData[row]?.[col] ?? fill),
  );
}

const SCATTER_ACCENT_TEMPLATE: (DotTone | null)[][] = [
  [null, "mid", null, null, null, null, "dark", null, "mid", null, null, null],
  [null, null, null, "mid", null, null, null, null, "dark", null, null, "mid"],
  ["dark", null, null, "mid", null, null, null, "mid", null, null, null, null],
  [null, null, null, null, "mid", null, null, null, null, "dark", null, null],
  [null, null, "dark", null, null, "mid", null, null, null, "mid", null, "dark"],
  ["mid", null, null, null, null, "dark", null, null, null, null, "mid", null],
  [null, null, "mid", null, null, null, "mid", null, null, "dark", null, null],
  [null, null, null, "dark", null, null, null, "mid", null, null, null, "mid"],
  [null, null, "mid", null, null, "dark", null, null, null, "mid", null, null],
  [null, "dark", null, null, "mid", null, null, null, "dark", null, null, "mid"],
  [null, null, null, null, "mid", "dark", null, "mid", null, null, "dark", null],
  ["mid", null, null, null, null, "mid", null, "dark", null, null, null, null],
];

function scatterAccentMask(rows: number, cols: number): (DotTone | null)[][] {
  return fitAccentMask(SCATTER_ACCENT_TEMPLATE, rows, cols);
}

function buildScatterGrid(rows: number, cols: number, fill: ScatterFill): DotTone[][] {
  const total = fill.light + fill.mid + fill.dark;
  const accents = scatterAccentMask(rows, cols);
  return accents.map((row, rowIndex) =>
    row.map((accent, colIndex) => {
      if (accent) return accent;
      const bucket = (rowIndex * 17 + colIndex * 31 + fill.seed * 13) % total;
      if (bucket < fill.light) return "light";
      if (bucket < fill.light + fill.mid) return "mid";
      return "dark";
    }),
  );
}

const scatterVariants: Record<
  "scatter" | "scatter-soft" | "scatter-rich" | "scatter-heavy" | "scatter-speckled",
  { label: string; fill: ScatterFill }
> = {
  scatter: {
    label: "Scatter",
    fill: { light: 32, mid: 46, dark: 22, seed: 2 },
  },
  "scatter-soft": {
    label: "Scatter soft",
    fill: { light: 52, mid: 36, dark: 12, seed: 1 },
  },
  "scatter-rich": {
    label: "Scatter rich",
    fill: { light: 22, mid: 48, dark: 30, seed: 3 },
  },
  "scatter-heavy": {
    label: "Scatter heavy",
    fill: { light: 10, mid: 44, dark: 46, seed: 4 },
  },
  "scatter-speckled": {
    label: "Scatter speckled",
    fill: { light: 18, mid: 34, dark: 48, seed: 5 },
  },
};

function buildProceduralPatterns(
  rows: number,
  cols: number,
): Record<Exclude<DotPatternId, keyof typeof scatterVariants>, DotPatternDefinition> {
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;

  return {
    diagonal: {
      label: "Diagonal",
      grid: grid(rows, cols, (row, col) => {
        const band = (row + col) % 5;
        if (band === 0) return "dark";
        if (band === 2) return "mid";
        return "light";
      }),
    },
    radial: {
      label: "Radial",
      grid: grid(rows, cols, (row, col) => {
        const dx = row - centerRow;
        const dy = col - centerCol;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const outer = Math.max(centerRow, centerCol) * 0.85;
        const inner = Math.max(centerRow, centerCol) * 0.45;
        if (distance > outer) return "dark";
        if (distance > inner) return "mid";
        return "light";
      }),
    },
    corners: {
      label: "Corners",
      grid: grid(rows, cols, (row, col) => {
        const inset = Math.min(row, col, rows - 1 - row, cols - 1 - col);
        const maxInset = Math.min(Math.floor(rows / 2), Math.floor(cols / 2));
        if (inset <= 0) return "dark";
        if (inset <= Math.max(1, maxInset - 2)) return "mid";
        return "light";
      }),
    },
    noise: {
      label: "Noise",
      grid: grid(rows, cols, (row, col) => {
        const bucket = (row * 17 + col * 31 + row * col) % 9;
        if (bucket <= 1) return "dark";
        if (bucket <= 4) return "mid";
        return "light";
      }),
    },
    ripple: {
      label: "Ripple",
      grid: grid(rows, cols, (row, col) => {
        const wave = Math.sin(col * 0.75 + row * 0.35);
        if (wave > 0.55) return "dark";
        if (wave > 0.05) return "mid";
        return "light";
      }),
    },
  };
}

export function buildDotPatterns(
  rows: number = DEFAULT_DOT_PATTERN_ROWS,
  cols: number = DEFAULT_DOT_PATTERN_COLS,
): Record<DotPatternId, DotPatternDefinition> {
  const scatterEntries = Object.entries(scatterVariants).map(([id, { label, fill }]) => [
    id,
    { label, grid: buildScatterGrid(rows, cols, fill) },
  ]);

  const procedural = buildProceduralPatterns(rows, cols);

  const merged = {
    ...Object.fromEntries(scatterEntries),
    ...procedural,
  } as Record<DotPatternId, DotPatternDefinition>;

  return Object.fromEntries(
    Object.entries(merged).map(([id, pattern]) => [
      id,
      { ...pattern, grid: fitGrid(pattern.grid, rows, cols) },
    ]),
  ) as Record<DotPatternId, DotPatternDefinition>;
}

export const dotPatternIds = Object.keys(scatterVariants).concat([
  "diagonal",
  "radial",
  "corners",
  "noise",
  "ripple",
]) as DotPatternId[];

export function dotPatternGrid(
  id: DotPatternId,
  rows: number = DEFAULT_DOT_PATTERN_ROWS,
  cols: number = DEFAULT_DOT_PATTERN_COLS,
): DotTone[][] {
  return buildDotPatterns(rows, cols)[id].grid;
}

export function mirrorDotPatternGrid(gridData: DotTone[][]): DotTone[][] {
  return gridData.map((row) => [...row].reverse());
}
