import { describe, expect, it } from "vitest";
import { computeOverflowLayout, type OverflowSegment } from "./overflow-layout";

describe("computeOverflowLayout", () => {
  const gap = 4;

  const withEllipsis = (widths: [number, number, number, number]): OverflowSegment[] => [
    { kind: "item", widthPx: widths[0] },
    { kind: "item", widthPx: widths[1] },
    { kind: "ellipsis", widthPx: widths[2] },
    { kind: "item", widthPx: widths[3] },
  ];

  it("returns all hidden when container width is 0", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 0,
      gapPx: gap,
      segments: withEllipsis([80, 95, 24, 70]),
    });

    expect(result.visible.every((value) => value === false)).toBe(true);
    expect(result.collapsed).toBe(false);
  });

  it("shows all items without ellipsis when everything fits", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 300,
      gapPx: gap,
      segments: withEllipsis([80, 95, 24, 70]),
    });

    expect(result.visible).toEqual([true, true, false, true]);
    expect(result.showEllipsis).toBe(false);
    expect(result.hiddenCount).toBe(0);
    expect(result.collapsed).toBe(false);
  });

  it("hides from the longer left side first", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 200,
      gapPx: gap,
      segments: withEllipsis([80, 95, 24, 70]),
    });

    expect(result.visible).toEqual([false, true, true, true]);
    expect(result.showEllipsis).toBe(true);
    expect(result.hiddenBefore).toBe(1);
    expect(result.hiddenAfter).toBe(0);
    expect(result.hiddenCount).toBe(1);
  });

  it("hides from the longer right side first", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 180,
      gapPx: gap,
      segments: [
        { kind: "item", widthPx: 50 },
        { kind: "ellipsis", widthPx: 24 },
        { kind: "item", widthPx: 60 },
        { kind: "item", widthPx: 70 },
        { kind: "item", widthPx: 80 },
      ],
    });

    expect(result.visible).toEqual([true, true, true, false, false]);
    expect(result.hiddenBefore).toBe(0);
    expect(result.hiddenAfter).toBe(2);
  });

  it("alternates when left and right counts are balanced", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 120,
      gapPx: gap,
      segments: [
        { kind: "item", widthPx: 50 },
        { kind: "item", widthPx: 50 },
        { kind: "ellipsis", widthPx: 24 },
        { kind: "item", widthPx: 50 },
        { kind: "item", widthPx: 50 },
      ],
    });

    expect(result.visible).toEqual([false, true, true, false, false]);
    expect(result.hiddenBefore).toBe(1);
    expect(result.hiddenAfter).toBe(2);
  });

  it("accounts for gap between visible segments", () => {
    const segments = withEllipsis([40, 40, 20, 40]);
    const widthWithoutFirst = 40 + gap + 20 + gap + 40;

    const result = computeOverflowLayout({
      containerWidthPx: widthWithoutFirst,
      gapPx: gap,
      segments,
    });

    expect(result.visible).toEqual([false, true, true, true]);
    expect(rowWidth(segments, result.visible, gap)).toBeLessThanOrEqual(widthWithoutFirst);
  });

  it("shows ellipsis alone when nothing else fits", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 20,
      gapPx: gap,
      segments: withEllipsis([80, 95, 24, 70]),
    });

    expect(result.visible).toEqual([false, false, true, false]);
    expect(result.showEllipsis).toBe(true);
    expect(result.hiddenCount).toBe(3);
  });

  it("truncates from the trailing edge when no ellipsis segment exists", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 100,
      gapPx: gap,
      segments: [
        { kind: "item", widthPx: 40 },
        { kind: "item", widthPx: 40 },
        { kind: "item", widthPx: 40 },
      ],
    });

    expect(result.visible).toEqual([true, true, false]);
    expect(result.showEllipsis).toBe(false);
    expect(result.hiddenAfter).toBe(1);
    expect(result.hiddenBefore).toBe(0);
  });

  it("never hides pinned breadcrumb segments", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 150,
      gapPx: gap,
      segments: [
        { kind: "item", widthPx: 50, pinned: true },
        { kind: "ellipsis", widthPx: 24 },
        { kind: "item", widthPx: 80 },
        { kind: "item", widthPx: 60, pinned: true },
      ],
    });

    expect(result.visible).toEqual([true, true, false, true]);
    expect(result.hiddenBefore).toBe(0);
    expect(result.hiddenAfter).toBe(1);
  });

  it("hides rightmost items first when ellipsis is trailing", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 120,
      gapPx: gap,
      segments: [
        { kind: "item", widthPx: 40 },
        { kind: "item", widthPx: 40 },
        { kind: "item", widthPx: 40 },
        { kind: "ellipsis", widthPx: 24 },
      ],
    });

    expect(result.visible).toEqual([true, true, false, true]);
    expect(result.hiddenBefore).toBe(1);
    expect(result.hiddenAfter).toBe(0);
  });

  it("hides leftmost items first when ellipsis is leading", () => {
    const result = computeOverflowLayout({
      containerWidthPx: 120,
      gapPx: gap,
      segments: [
        { kind: "ellipsis", widthPx: 24 },
        { kind: "item", widthPx: 40 },
        { kind: "item", widthPx: 40 },
        { kind: "item", widthPx: 40 },
      ],
    });

    expect(result.visible).toEqual([true, false, true, true]);
    expect(result.hiddenBefore).toBe(0);
    expect(result.hiddenAfter).toBe(1);
  });
});

function rowWidth(segments: OverflowSegment[], visible: boolean[], gapPx: number): number {
  let count = 0;
  let sum = 0;
  for (let i = 0; i < segments.length; i++) {
    if (!visible[i]) continue;
    sum += segments[i].widthPx;
    count++;
  }
  if (count <= 0) return 0;
  return sum + (count - 1) * gapPx;
}
