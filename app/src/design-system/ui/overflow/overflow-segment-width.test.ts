import { describe, expect, it } from "vitest";
import { resolveSegmentNaturalWidth } from "./overflow-segment-width";

describe("resolveSegmentNaturalWidth", () => {
  it("uses declared width when provided", () => {
    expect(resolveSegmentNaturalWidth({ measuredWidthPx: 80, declaredWidthPx: 32 })).toBe(32);
  });

  it("uses measured width when no declaration", () => {
    expect(resolveSegmentNaturalWidth({ measuredWidthPx: 80 })).toBe(80);
  });

  it("caps at maxWidthPx", () => {
    expect(resolveSegmentNaturalWidth({ measuredWidthPx: 200, maxWidthPx: 128 })).toBe(128);
  });

  it("caps declared width at maxWidthPx", () => {
    expect(resolveSegmentNaturalWidth({ measuredWidthPx: 200, declaredWidthPx: 150, maxWidthPx: 128 })).toBe(
      128,
    );
  });
});
