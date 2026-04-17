import { useEditor } from "@tiptap/vue-3";

export type EpicStoryRichTextEditorOptions = NonNullable<
  Parameters<typeof useEditor>[0]
>;

/**
 * Thin wrapper over `useEditor` for a consistent import path; callers supply full `extensions` (core + mention + placeholder, etc.).
 */
export function useEpicStoryRichTextEditor(
  options: EpicStoryRichTextEditorOptions,
) {
  return useEditor(options);
}
