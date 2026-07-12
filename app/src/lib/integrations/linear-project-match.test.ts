import { describe, expect, it } from "vitest";
import {
  normalizeProjectName,
  scoreProjectNameSimilarity,
  suggestEpicProjectMatch,
} from "./linear-project-match";

describe("linear-project-match", () => {
  it("normalizes names", () => {
    expect(normalizeProjectName("  My-App_V2 ")).toBe("my app v2");
  });

  it("scores exact and containment matches highly", () => {
    expect(scoreProjectNameSimilarity("Mobile", "Mobile")).toBe(1);
    expect(scoreProjectNameSimilarity("Mobile App", "Mobile")).toBeGreaterThanOrEqual(0.85);
  });

  it("suggests the best epic project above threshold", () => {
    const match = suggestEpicProjectMatch("Github Integration", [
      { id: 1, name: "Unrelated" },
      { id: 2, name: "GitHub Integration" },
      { id: 3, name: "Other" },
    ]);
    expect(match?.id).toBe(2);
  });

  it("returns null when nothing is similar enough", () => {
    expect(
      suggestEpicProjectMatch("Alpha", [
        { id: 1, name: "Zeta" },
        { id: 2, name: "Omega" },
      ]),
    ).toBeNull();
  });
});
