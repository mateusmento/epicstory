import { describe, expect, it } from "vitest";
import { extractMentionIdsFromDoc } from "./mentions-doc";
import { mergeQuotedMessageIntoDoc } from "./message";
import { normalizeTiptapDoc } from "./normalize";
import { tiptapToPlainText } from "./plain-text";

describe("normalizeTiptapDoc", () => {
  it("strips trailing empty paragraph", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hi" }],
        },
        { type: "paragraph", content: [] },
      ],
    };
    const out = normalizeTiptapDoc(doc) as { content: unknown[] };
    expect(out.content).toHaveLength(1);
  });
});

describe("tiptapToPlainText", () => {
  it("extracts mention as @id", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "mention", attrs: { id: 42 } }],
        },
      ],
    };
    expect(tiptapToPlainText(doc)).toBe("@42");
  });

  it("flattens paragraph newlines", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "b" }],
        },
      ],
    };
    expect(tiptapToPlainText(doc)).toBe("a\nb");
  });
});

describe("extractMentionIdsFromDoc", () => {
  it("collects unique numeric ids", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { id: 1 } },
            { type: "mention", attrs: { id: 1 } },
            { type: "mention", attrs: { userId: 2 } },
          ],
        },
      ],
    };
    expect(extractMentionIdsFromDoc(doc).sort()).toEqual([1, 2]);
  });
});

describe("mergeQuotedMessageIntoDoc", () => {
  it("prepends blockquote with excerpt", () => {
    const main = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "reply" }],
        },
      ],
    };
    const out = mergeQuotedMessageIntoDoc(
      {
        sender: { name: "Ada" },
        content: "quoted plain",
        contentRich: undefined,
      },
      main,
    ) as { content: { type: string }[] };
    expect(out.content[0].type).toBe("blockquote");
    expect(tiptapToPlainText(out)).toContain("Ada");
    expect(tiptapToPlainText(out)).toContain("quoted plain");
  });

  it("embeds rich blocks from contentRich (e.g. code blocks)", () => {
    const main = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "reply" }],
        },
      ],
    };
    const out = mergeQuotedMessageIntoDoc(
      {
        sender: { name: "Bob" },
        content: "",
        contentRich: {
          type: "doc",
          content: [
            {
              type: "codeBlock",
              content: [{ type: "text", text: "console.log(1)" }],
            },
          ],
        },
      },
      main,
    ) as { content: { type: string; content?: { type: string }[] }[] };
    expect(out.content[0].type).toBe("blockquote");
    const inner = out.content[0].content ?? [];
    expect(inner.some((n) => n.type === "codeBlock")).toBe(true);
    expect(tiptapToPlainText(out)).toContain("console.log(1)");
  });
});
