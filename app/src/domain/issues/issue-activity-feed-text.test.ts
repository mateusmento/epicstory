import { describe, expect, it } from "vitest";
import type { IIssueFeedItem, ParentChangedPayload } from "@epicstory/contracts";
import { formatIssueActivitySentence } from "./issue-activity-feed-text";

const peersById = new Map();

function parentChangedItem(payload: ParentChangedPayload): IIssueFeedItem {
  return {
    activityId: 1,
    issueId: 1,
    type: "parent_changed",
    actorId: 1,
    actor: { id: 1, name: "Ada", email: "ada@example.com" },
    createdAt: new Date().toISOString(),
    messageId: null,
    attachmentId: null,
    payload,
    message: null,
    replyPreviews: [],
  };
}

describe("formatIssueActivitySentence parent_changed", () => {
  it("uses issue keys when both are known", () => {
    expect(
      formatIssueActivitySentence(
        parentChangedItem({
          previousParentIssueId: 10,
          newParentIssueId: 12,
          previousParentIssueKey: "EPV1-10",
          newParentIssueKey: "EPV1-12",
        }),
        peersById,
      ),
    ).toBe("Ada changed parent issue from EPV1-10 to EPV1-12");
  });

  it("uses generic copy when keys are missing (never numeric id)", () => {
    expect(
      formatIssueActivitySentence(
        parentChangedItem({
          previousParentIssueId: 10,
          newParentIssueId: 12,
        }),
        peersById,
      ),
    ).toBe("Ada changed the parent issue");

    expect(
      formatIssueActivitySentence(
        parentChangedItem({
          newParentIssueId: 12,
        }),
        peersById,
      ),
    ).toBe("Ada set a parent issue");

    expect(
      formatIssueActivitySentence(
        parentChangedItem({
          previousParentIssueId: 10,
          newParentIssueId: null,
        }),
        peersById,
      ),
    ).toBe("Ada removed the parent issue");
  });

  it("formats set and remove when keys are present", () => {
    expect(
      formatIssueActivitySentence(
        parentChangedItem({
          newParentIssueId: 12,
          newParentIssueKey: "EPV1-12",
        }),
        peersById,
      ),
    ).toBe("Ada set parent issue to EPV1-12");

    expect(
      formatIssueActivitySentence(
        parentChangedItem({
          previousParentIssueId: 10,
          newParentIssueId: null,
          previousParentIssueKey: "EPV1-10",
        }),
        peersById,
      ),
    ).toBe("Ada removed parent issue (was EPV1-10)");
  });

  it("does not include hash-id patterns in output", () => {
    const sentence = formatIssueActivitySentence(
      parentChangedItem({
        previousParentIssueId: 10,
        newParentIssueId: 12,
      }),
      peersById,
    );
    expect(sentence).not.toMatch(/#\d+/);
  });
});
