import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";

export const slashCommandPluginKey = new PluginKey("slashCommand");

export type SlashCommandItem = {
  id: string;
  label: string;
  description?: string;
};

/**
 * TipTap `/` command palette. App supplies `suggestion` (items + render + command).
 */
export function createSlashCommandExtension(
  suggestion: Partial<Omit<SuggestionOptions<SlashCommandItem>, "editor">>,
) {
  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          pluginKey: slashCommandPluginKey,
          startOfLine: false,
          /** Allow `/` at doc start (default TipTap prefixes require a leading space). */
          allowedPrefixes: null,
          ...suggestion,
        } satisfies Partial<SuggestionOptions>,
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}
