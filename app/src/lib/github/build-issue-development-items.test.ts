import { describe, expect, it } from "vitest";
import type { IGithubIssueBranchLink, IGithubIssuePullRequestLink } from "@epicstory/contracts";
import { buildIssueDevelopmentItems, groupIssueDevelopmentItems } from "./build-issue-development-items";

function branch(
  partial: Pick<IGithubIssueBranchLink, "id" | "fullName" | "branchName"> & Partial<IGithubIssueBranchLink>,
): IGithubIssueBranchLink {
  const [owner, repoName] = partial.fullName.split("/");
  return {
    owner: owner ?? "o",
    repoName: repoName ?? "r",
    htmlUrl: `https://github.com/${partial.fullName}/tree/${partial.branchName}`,
    source: "epicstory_create",
    firstLinkedAt: "2026-01-01T00:00:00.000Z",
    lastPushedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function pr(
  partial: Pick<IGithubIssuePullRequestLink, "id" | "fullName" | "prNumber" | "headRef"> &
    Partial<IGithubIssuePullRequestLink>,
): IGithubIssuePullRequestLink {
  const [owner, repoName] = partial.fullName.split("/");
  return {
    issueId: 1,
    githubPullRequestId: `gh-${partial.id}`,
    owner: owner ?? "o",
    repoName: repoName ?? "r",
    htmlUrl: `https://github.com/${partial.fullName}/pull/${partial.prNumber}`,
    baseRef: "main",
    state: "open",
    draft: false,
    merged: false,
    mergedAt: null,
    closedAt: null,
    githubUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("buildIssueDevelopmentItems", () => {
  it("emits a PR row and hides the matched branch", () => {
    const items = buildIssueDevelopmentItems(
      [branch({ id: 1, fullName: "acme/api", branchName: "feat/EP-1" })],
      [pr({ id: 10, fullName: "acme/api", prNumber: 42, headRef: "feat/EP-1" })],
      "open",
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "pr", prNumber: 42, headRef: "feat/EP-1" });
  });

  it("emits a branch row when no PR matches", () => {
    const items = buildIssueDevelopmentItems(
      [branch({ id: 1, fullName: "acme/api", branchName: "feat/EP-1-bar" })],
      [],
      "open",
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "branch", branchName: "feat/EP-1-bar" });
  });

  it("shows branch again on open filter when only a merged PR exists for that head", () => {
    const items = buildIssueDevelopmentItems(
      [branch({ id: 1, fullName: "acme/api", branchName: "feat/EP-1" })],
      [
        pr({
          id: 10,
          fullName: "acme/api",
          prNumber: 9,
          headRef: "feat/EP-1",
          state: "closed",
          merged: true,
        }),
      ],
      "open",
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "branch", branchName: "feat/EP-1" });
  });

  it("hides branch-only rows on merged filter", () => {
    const items = buildIssueDevelopmentItems(
      [branch({ id: 1, fullName: "acme/api", branchName: "feat/EP-1" })],
      [],
      "merged",
    );
    expect(items).toHaveLength(0);
  });

  it("keeps orphan PRs without a branch link", () => {
    const items = buildIssueDevelopmentItems(
      [],
      [pr({ id: 10, fullName: "acme/web", prNumber: 7, headRef: "orphan-branch" })],
      "open",
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "pr", prNumber: 7 });
  });
});

describe("groupIssueDevelopmentItems", () => {
  it("groups by fullName across repos", () => {
    const groups = groupIssueDevelopmentItems(
      [
        branch({ id: 1, fullName: "acme/web", branchName: "feat/a" }),
        branch({ id: 2, fullName: "acme/api", branchName: "feat/b" }),
      ],
      [pr({ id: 10, fullName: "acme/api", prNumber: 3, headRef: "feat/b" })],
      "open",
    );

    expect(groups.map((g) => g.fullName)).toEqual(["acme/api", "acme/web"]);
    expect(groups[0]!.items[0]).toMatchObject({ kind: "pr", prNumber: 3 });
    expect(groups[1]!.items[0]).toMatchObject({ kind: "branch", branchName: "feat/a" });
  });
});
