import { describe, expect, it } from "vitest";
import { intrinsicRowWidthPx, rowWidthPx } from "./overflow-intrinsic";
import type { OverflowSegment } from "./overflow-layout";

describe("rowWidthPx", () => {
  it("sums segment widths and gaps", () => {
    expect(rowWidthPx([{ widthPx: 40 }, { widthPx: 50 }], 4)).toBe(94);
  });

  it("returns 0 for empty segments", () => {
    expect(rowWidthPx([], 4)).toBe(0);
  });
});

describe("intrinsicRowWidthPx", () => {
  it("sums item widths with gaps", () => {
    const segments: OverflowSegment[] = [
      { kind: "item", widthPx: 40 },
      { kind: "item", widthPx: 50 },
    ];
    expect(intrinsicRowWidthPx(segments, 4)).toBe(94);
  });

  it("adds ellipsis reserve when ellipsis segment exists", () => {
    const segments: OverflowSegment[] = [
      { kind: "item", widthPx: 40 },
      { kind: "ellipsis", widthPx: 24 },
    ];
    expect(intrinsicRowWidthPx(segments, 4, { ellipsisReservePx: 24 })).toBe(68);
  });

  it("excludes ellipsis from item sum but adds reserve", () => {
    const segments: OverflowSegment[] = [
      { kind: "item", widthPx: 30 },
      { kind: "item", widthPx: 30 },
      { kind: "ellipsis", widthPx: 20 },
    ];
    expect(intrinsicRowWidthPx(segments, 4, { ellipsisReservePx: 20 })).toBe(68);
  });
});
