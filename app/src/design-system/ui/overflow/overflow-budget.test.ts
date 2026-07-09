import { describe, expect, it } from "vitest";
import { resolveOverflowBudget, shouldTruncate } from "./overflow-budget";

describe("resolveOverflowBudget", () => {
  const intrinsic = 200;
  const used = 120;

  it("intrinsic mode always uses intrinsic row width", () => {
    expect(
      resolveOverflowBudget({
        mode: "intrinsic",
        usedContainerWidthPx: used,
        intrinsicRowWidthPx: intrinsic,
      }),
    ).toBe(200);
    expect(
      resolveOverflowBudget({ mode: "intrinsic", usedContainerWidthPx: 0, intrinsicRowWidthPx: intrinsic }),
    ).toBe(200);
  });

  it("fill mode bootstraps with intrinsic when used is 0", () => {
    expect(
      resolveOverflowBudget({ mode: "fill", usedContainerWidthPx: 0, intrinsicRowWidthPx: intrinsic }),
    ).toBe(200);
    expect(
      resolveOverflowBudget({ mode: "fill", usedContainerWidthPx: used, intrinsicRowWidthPx: intrinsic }),
    ).toBe(120);
  });

  it("auto mode bootstraps with intrinsic when used is 0", () => {
    expect(
      resolveOverflowBudget({ mode: "auto", usedContainerWidthPx: 0, intrinsicRowWidthPx: intrinsic }),
    ).toBe(200);
    expect(
      resolveOverflowBudget({ mode: "auto", usedContainerWidthPx: used, intrinsicRowWidthPx: intrinsic }),
    ).toBe(120);
  });
});

describe("shouldTruncate", () => {
  it("returns true when intrinsic exceeds budget", () => {
    expect(shouldTruncate(200, 120)).toBe(true);
  });

  it("returns false when intrinsic fits in budget", () => {
    expect(shouldTruncate(100, 120)).toBe(false);
    expect(shouldTruncate(120, 120)).toBe(false);
  });
});
