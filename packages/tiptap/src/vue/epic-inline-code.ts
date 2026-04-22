import { Code } from "@tiptap/extension-code";
import { InputRule } from "@tiptap/core";

/** Holds an empty inline `code` mark until the user types real text (removed on export). */
const ZWSP = "\u200b";

/**
 * Extends TipTap `Code` with: type `` `` after any run of text whose **last** character is not a backtick,
 * at end of the text node (WYSIWYG). Fails for trailing ``` because the character before the final `` is
 * itself a backtick, so Enter can still turn ``` into a fenced code block. Standard `` `snippet` `` still
 * works via the default rule.
 */
export const EpicInlineCode = Code.extend({
  addInputRules() {
    const markType = this.type;
    const codeAttrs = this.options.HTMLAttributes ?? {};
    const doubleBacktickOpen = new InputRule({
      /**
       * `(.*[^`])(``)$` → any prefix, then a non-backtick, then the closing pair. Excludes suffix ```…
       * (before ``` the char before `` is `) and bare leading `` (no [^`] yet).
       */
      find: /(.*[^`])(``)$/,
      handler: ({ state, range, match, chain }) => {
        const prefix = match[1];
        const full = match[0];
        if (full.length < 3 || prefix.length < 1) return null;

        const $from = state.selection.$from;
        if ($from.marks().some((m) => m.type === markType)) return null;

        const { parent } = $from;
        if (parent.type.spec.code) return null;

        const codeBlock = state.schema.nodes.codeBlock;
        if (codeBlock && parent.type === codeBlock) return null;

        const start = range.from + prefix.length;
        const end = range.to;
        chain()
          .deleteRange({ from: start, to: end })
          .insertContentAt(start, {
            type: "text",
            text: ZWSP,
            marks: [{ type: "code", attrs: codeAttrs }],
          })
          .setTextSelection(start + 1)
          .run();
      },
    });

    return [doubleBacktickOpen, ...(this.parent?.() ?? [])];
  },
});
