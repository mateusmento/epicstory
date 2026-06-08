import type { Editor } from "@tiptap/core";

/**
 * TipTap's suggestion plugin only re-runs `items` when the trigger query changes. After workspace
 * member pagination appends users, bump the last query character so the list refreshes.
 */
export function bumpActiveMentionSuggestionQuery(editor: Editor | null | undefined): void {
  if (!editor) return;
  const { state } = editor;
  for (const plugin of state.plugins) {
    const st = plugin.getState(state) as {
      active?: boolean;
      range?: { from: number; to: number };
      query?: string | null;
    } | null;
    if (!st?.active || !st.range) continue;
    const q = st.query ?? "";
    if (q.length < 1) return;
    const end = st.range.to;
    editor
      .chain()
      .focus()
      .deleteRange({ from: end - 1, to: end })
      .insertContentAt(end - 1, q.slice(-1))
      .run();
    return;
  }
}
