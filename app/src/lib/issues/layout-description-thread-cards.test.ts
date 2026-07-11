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

  it("pins the active card at ideal Y even when default stack would push it down", () => {
    const items = [
      { id: 1, idealTop: 10, height: 100 },
      { id: 2, idealTop: 40, height: 80 },
      { id: 3, idealTop: 200, height: 60 },
    ];
    const defaultPlaced = layoutDescriptionThreadCards(items, 8);
    expect(defaultPlaced.find((p) => p.id === 2)?.top).toBe(118);

    const focused = layoutDescriptionThreadCards(items, 8, 2);
    expect(focused.find((p) => p.id === 2)?.top).toBe(40);
    // Card above overlaps active → push up (may go negative).
    const first = focused.find((p) => p.id === 1)!;
    expect(first.top).toBe(40 - 100 - 8);
    // Card below already clears active → keeps its forward-pack Y.
    expect(focused.find((p) => p.id === 3)?.top).toBe(206);
  });

  it("only shifts the contiguous overlapping neighbors — distant cards keep their Y", () => {
    const items = [
      { id: "top", idealTop: 10, height: 80 },
      { id: "mid", idealTop: 200, height: 80 },
      { id: "near", idealTop: 760, height: 80 },
      { id: "active", idealTop: 800, height: 80 },
    ];
    const focused = layoutDescriptionThreadCards(items, 8, "active");

    expect(focused.find((p) => p.id === "active")?.top).toBe(800);
    // Near card overlaps active → pushed up.
    expect(focused.find((p) => p.id === "near")?.top).toBe(800 - 80 - 8);
    // Distant cards already clear the shifted neighbor → unchanged from forward pack.
    expect(focused.find((p) => p.id === "mid")?.top).toBe(200);
    expect(focused.find((p) => p.id === "top")?.top).toBe(10);
  });

  it("packs a tight overlapping run above the active card", () => {
    const placed = layoutDescriptionThreadCards(
      [
        { id: "a", idealTop: 50, height: 80 },
        { id: "b", idealTop: 60, height: 80 },
        { id: "c", idealTop: 100, height: 80 },
      ],
      8,
      "c",
    );
    const a = placed.find((p) => p.id === "a")!;
    const b = placed.find((p) => p.id === "b")!;
    const c = placed.find((p) => p.id === "c")!;
    expect(c.top).toBe(100);
    // Forward pack had b stacked at 138; pinning c at 100 forces b (then a) up.
    expect(b.top).toBe(12);
    expect(b.top + 80 + 8).toBeLessThanOrEqual(c.top);
    expect(a.top).toBe(12 - 80 - 8);
    expect(a.top + 80 + 8).toBeLessThanOrEqual(b.top);
  });

  it("falls back to forward pack when activeId is missing from the list", () => {
    const items = [
      { id: 1, idealTop: 10, height: 100 },
      { id: 2, idealTop: 40, height: 80 },
    ];
    expect(layoutDescriptionThreadCards(items, 8, 999)).toEqual(layoutDescriptionThreadCards(items, 8));
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
