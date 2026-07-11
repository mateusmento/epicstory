import { describe, expect, it } from "vitest";
import {
  compareDescriptionThreadsByAnchor,
  layoutDescriptionThreadCards,
} from "./layout-description-thread-cards";

describe("layoutDescriptionThreadCards", () => {
  it("places distant cards at their ideal Y", () => {
    const placed = layoutDescriptionThreadCards([
      { id: 1, idealTop: 10, height: 80 },
      { id: 2, idealTop: 400, height: 80 },
    ]);
    expect(placed).toEqual([
      { id: 1, top: 10 },
      { id: 2, top: 400 },
    ]);
  });

  it("stacks when ideal Y would overlap the previous card", () => {
    const placed = layoutDescriptionThreadCards(
      [
        { id: 1, idealTop: 10, height: 100 },
        { id: 2, idealTop: 40, height: 80 },
      ],
      8,
    );
    expect(placed).toEqual([
      { id: 1, top: 10 },
      { id: 2, top: 118 },
    ]);
  });
});

describe("compareDescriptionThreadsByAnchor", () => {
  it("orders by anchor then createdAt", () => {
    const items = [
      { anchorFrom: 20, createdAt: "2026-01-02" },
      { anchorFrom: 10, createdAt: "2026-01-03" },
      { anchorFrom: 10, createdAt: "2026-01-01" },
    ];
    expect([...items].sort(compareDescriptionThreadsByAnchor).map((i) => i.createdAt)).toEqual([
      "2026-01-01",
      "2026-01-03",
      "2026-01-02",
    ]);
  });
});
