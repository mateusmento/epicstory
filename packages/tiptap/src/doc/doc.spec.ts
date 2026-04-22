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

  it("strips trailing newlines from codeBlock text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const x = 1;\n\n" }],
        },
      ],
    };
    const out = normalizeTiptapDoc(doc) as {
      content: { type: string; content: { type: string; text: string }[] }[];
    };
    expect(out.content[0].content[0].text).toBe("const x = 1;");
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

  it("wraps inline code in backticks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "x " },
            { type: "text", text: "y", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc)).toBe("x `y`");
  });

  it("drops empty inline code placeholders (zero-width) in plain text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "\u200b",
              marks: [{ type: "code" }],
            },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc)).toBe("");
  });

  it("prefixes blockquote lines for plain text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "quoted" }],
            },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc)).toBe("> quoted");
  });

  it("stripFormatting removes inline code backticks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "x " },
            { type: "text", text: "y", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc, { stripFormatting: true })).toBe("x y");
  });

  it("stripFormatting removes blockquote line prefixes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "quoted" }],
            },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc, { stripFormatting: true })).toBe("quoted");
  });

  it("stripFormatting omits code block language line", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    };
    expect(tiptapToPlainText(doc, { stripFormatting: true })).toBe("const x = 1;");
  });

  it("stripFormatting uses image URL without bracket wrapper", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: { src: "https://ex/img.png" },
            },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc, { stripFormatting: true })).toContain(
      "https://ex/img.png",
    );
    expect(tiptapToPlainText(doc, { stripFormatting: true })).not.toContain(
      "[image:",
    );
  });

  it("default plain text wraps image src in bracket label", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "image", attrs: { src: "https://ex/img.png" } },
          ],
        },
      ],
    };
    expect(tiptapToPlainText(doc)).toContain("[image:");
    expect(tiptapToPlainText(doc)).toContain("https://ex/img.png");
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
