import { describe, expect, it } from "vitest";
import { computeVisibleStackedAvatars } from "./user-avatar-stack-layout";

describe("computeVisibleStackedAvatars", () => {
  const base = {
    itemWidthPx: 24,
    overlapPx: 12,
    overflowBadgeWidthPx: 24,
    min: 2,
  };

  it("returns 0 when container width is 0", () => {
    expect(
      computeVisibleStackedAvatars({
        ...base,
        containerWidth: 0,
        total: 5,
      }),
    ).toBe(0);
  });

  it("hides all when fewer than min fit but total >= min", () => {
    // One face needs 24px; min=2 needs 24+12=36px
    expect(
      computeVisibleStackedAvatars({
        ...base,
        containerWidth: 30,
        total: 5,
      }),
    ).toBe(0);
  });

  it("allows fewer than min when total < min", () => {
    expect(
      computeVisibleStackedAvatars({
        ...base,
        containerWidth: 30,
        total: 1,
      }),
    ).toBe(1);
  });

  it("accounts for overflow badge width when truncated", () => {
    // 3 faces + badge: 24 + 2*12 + 24 = 72
    expect(
      computeVisibleStackedAvatars({
        ...base,
        containerWidth: 72,
        total: 10,
        min: 1,
      }),
    ).toBe(3);
    expect(
      computeVisibleStackedAvatars({
        ...base,
        containerWidth: 71,
        total: 10,
        min: 1,
      }),
    ).toBe(2);
  });
});
