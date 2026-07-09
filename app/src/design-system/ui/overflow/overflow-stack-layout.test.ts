import { describe, expect, it } from "vitest";
import {
  computeVisibleStackedItems,
  stackItemLayoutWidthPx,
  stackedIntrinsicRowWidthPx,
  stackedRowWidthPx,
} from "./overflow-stack-layout";

describe("stackItemLayoutWidthPx", () => {
  it("uses full diameter for first item and stride for rest", () => {
    expect(stackItemLayoutWidthPx(0, 32, 14)).toBe(32);
    expect(stackItemLayoutWidthPx(1, 32, 14)).toBe(18);
    expect(stackItemLayoutWidthPx(2, 32, 14)).toBe(18);
  });
});

describe("stackedIntrinsicRowWidthPx", () => {
  it("computes width for all items without badge", () => {
    expect(stackedIntrinsicRowWidthPx(3, 32, 14)).toBe(32 + 18 + 18);
    expect(stackedIntrinsicRowWidthPx(1, 32, 14)).toBe(32);
  });
});

describe("stackedRowWidthPx", () => {
  it("adds badge width when truncated", () => {
    expect(
      stackedRowWidthPx({
        total: 5,
        visibleCount: 3,
        itemWidthPx: 32,
        overlapPx: 14,
        overflowBadgeWidthPx: 32,
      }),
    ).toBe(32 + 18 + 18 + 32);
  });

  it("omits badge when all items visible", () => {
    expect(
      stackedRowWidthPx({
        total: 3,
        visibleCount: 3,
        itemWidthPx: 32,
        overlapPx: 14,
        overflowBadgeWidthPx: 32,
      }),
    ).toBe(32 + 18 + 18);
  });
});

describe("computeVisibleStackedItems", () => {
  const base = {
    itemWidthPx: 24,
    overlapPx: 12,
    overflowBadgeWidthPx: 24,
    min: 2,
  };

  it("returns 0 when container width is 0", () => {
    expect(
      computeVisibleStackedItems({
        ...base,
        containerWidth: 0,
        total: 5,
      }),
    ).toBe(0);
  });

  it("hides all when fewer than min fit but total >= min", () => {
    expect(
      computeVisibleStackedItems({
        ...base,
        containerWidth: 30,
        total: 5,
      }),
    ).toBe(0);
  });

  it("allows fewer than min when total < min", () => {
    expect(
      computeVisibleStackedItems({
        ...base,
        containerWidth: 30,
        total: 1,
      }),
    ).toBe(1);
  });

  it("accounts for overflow badge width when truncated", () => {
    expect(
      computeVisibleStackedItems({
        ...base,
        containerWidth: 72,
        total: 10,
        min: 1,
      }),
    ).toBe(3);
    expect(
      computeVisibleStackedItems({
        ...base,
        containerWidth: 71,
        total: 10,
        min: 1,
      }),
    ).toBe(2);
  });
});
