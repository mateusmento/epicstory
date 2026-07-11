import { Mark, mergeAttributes } from "@tiptap/core";

export type DescriptionThreadMarkAttrs = {
  markId: string;
  kind: "comment" | "suggestion";
  /** comment: anchor; suggestion: base (original) | added (proposed) */
  role?: "anchor" | "base" | "added";
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    descriptionThread: {
      setDescriptionThread: (attrs: DescriptionThreadMarkAttrs) => ReturnType;
      unsetDescriptionThread: () => ReturnType;
    };
  }
}

/**
 * Inline mark anchoring a description comment / suggestion thread.
 * `markId` matches `IDescriptionThread.markId` in the API.
 *
 * Suggestions use Notion-style dual marks: `base` (original) + `added` (proposed).
 *
 * `excludes` is intentionally empty so this mark coexists with bold/italic/link
 * and (when attrs differ) other thread marks — TipTap/PM default would exclude same type.
 */
export const DescriptionThreadMark = Mark.create({
  name: "descriptionThread",
  inclusive: false,
  /** Empty list: do not exclude formatting or other thread marks. */
  excludes: "",
  spanning: true,
  keepOnSplit: false,

  addAttributes() {
    return {
      markId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-mark-id"),
        renderHTML: (attrs) =>
          attrs.markId ? { "data-mark-id": attrs.markId } : {},
      },
      kind: {
        default: "comment",
        parseHTML: (el) => el.getAttribute("data-thread-kind") ?? "comment",
        renderHTML: (attrs) => ({
          "data-thread-kind": attrs.kind ?? "comment",
        }),
      },
      role: {
        default: "anchor",
        parseHTML: (el) => el.getAttribute("data-thread-role") ?? "anchor",
        renderHTML: (attrs) => ({
          "data-thread-role": attrs.role ?? "anchor",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mark-id]" }, { tag: "mark[data-mark-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes["data-thread-kind"] ?? "comment";
    const role = HTMLAttributes["data-thread-role"] ?? "anchor";
    let mod = "epicstory-description-thread--comment";
    if (kind === "suggestion" && role === "base") {
      mod = "epicstory-description-thread--suggestion-base";
    } else if (kind === "suggestion" && role === "added") {
      mod = "epicstory-description-thread--suggestion-added";
    } else if (kind === "suggestion") {
      mod = "epicstory-description-thread--suggestion-base";
    }
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: `epicstory-description-thread ${mod}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDescriptionThread:
        (attrs) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          if (from === to) return false;
          const mark = this.type.create({
            role: "anchor",
            ...attrs,
          });
          // addMark preserves existing marks (bold, italic, other threads).
          if (dispatch) dispatch(tr.addMark(from, to, mark));
          return true;
        },
      unsetDescriptionThread:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          if (dispatch) dispatch(tr.removeMark(from, to, this.type));
          return true;
        },
    };
  },
});
