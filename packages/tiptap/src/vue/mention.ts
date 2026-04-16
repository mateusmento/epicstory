import type { Component } from "vue";
import type { AnyExtension } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import type { MentionOptions } from "@tiptap/extension-mention";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

/**
 * Mention + Vue node view; callers pass full Mention options (including optional `suggestion` from the app).
 */
export function createMentionExtensionWithNodeView(
  mentionNodeView: Component,
  options: MentionOptions & { userById?: (id: number) => unknown },
): AnyExtension {
  return Mention.extend({
    addNodeView() {
      return VueNodeViewRenderer(mentionNodeView);
    },
  }).configure(options as MentionOptions);
}
