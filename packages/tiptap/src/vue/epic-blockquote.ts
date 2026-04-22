import { mergeAttributes } from "@tiptap/core";
import Blockquote from "@tiptap/extension-blockquote";

/**
 * Blockquote with a dedicated rounded “rail” div (background) so the accent can be
 * fully rounded; border-left cannot round its ends cleanly.
 */
export const EpicBlockquote = Blockquote.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "epic-blockquote",
      }),
      [
        "div",
        mergeAttributes({
          class: "epic-blockquote-rail",
          "aria-hidden": "true",
          contenteditable: "false",
        }),
      ],
      ["div", mergeAttributes({ class: "epic-blockquote-body" }), 0],
    ];
  },

  parseHTML() {
    return [
      {
        tag: "blockquote.epic-blockquote",
        contentElement: (node: HTMLElement) =>
          node.querySelector(".epic-blockquote-body") ?? node,
      },
      { tag: "blockquote" },
    ];
  },
});
