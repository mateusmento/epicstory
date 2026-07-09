export type OverflowMode = "auto" | "fill" | "intrinsic";

export function resolveOverflowBudget(options: {
  mode: OverflowMode;
  usedContainerWidthPx: number;
  intrinsicRowWidthPx: number;
}): number {
  const { mode, usedContainerWidthPx, intrinsicRowWidthPx } = options;

  switch (mode) {
    case "intrinsic":
      return intrinsicRowWidthPx;
    case "fill":
      return usedContainerWidthPx > 0 ? usedContainerWidthPx : intrinsicRowWidthPx;
    case "auto":
      return usedContainerWidthPx > 0 ? usedContainerWidthPx : intrinsicRowWidthPx;
  }
}

export function shouldTruncate(intrinsicRowWidthPx: number, budgetPx: number): boolean {
  return intrinsicRowWidthPx > budgetPx;
}
