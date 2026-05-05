import { createVueFloatingSuggestion } from "@/core/tiptap";
import { epicStoryLowlight } from "@/core/epic-story-lowlight";
import type { User } from "@/domain/auth";
import {
  createMentionExtensionWithNodeView,
  createPlaceholderExtension,
  createRichTextExtensions,
} from "@epicstory/tiptap/vue";
import type { ComputedRef } from "vue";
import type { MentionSuggestionItem } from "./MentionList.vue";
import MentionList from "./MentionList.vue";
import TiptapCodeBlockCardNodeView from "./TiptapCodeBlockCardNodeView.vue";
import TiptapMentionNodeView from "./TiptapMentionNodeView.vue";

export function buildMentionSuggestion(mentionablesForSuggestion: ComputedRef<User[]>) {
  return createVueFloatingSuggestion({
    items: ({ query }): MentionSuggestionItem[] => {
      const q = (query ?? "").trim().toLowerCase();
      return mentionablesForSuggestion.value
        .filter((u) => (q ? u.name.toLowerCase().includes(q) || String(u.id).startsWith(q) : true))
        .slice(0, 8)
        .map((u) => ({ id: u.id, label: u.name, picture: u.picture }));
    },
    listComponent: MentionList,
    mapProps: ({ items, command, editor }) => ({ items, command, editor }),
    placement: "bottom-start",
    mainAxisOffset: 8,
    zIndex: 80,
    className: "outline-none",
  });
}

/**
 * Composer TipTap bodies for channel-style messages: text + mentions + code blocks.
 * Files are staged out-of-band in the composer, not embedded in JSON.
 */
export function createRichTextComposerExtensions(args: {
  getPlaceholder: () => string;
  mentionContext: { meId: number | undefined };
  mentionablesById: ComputedRef<Map<number, User>>;
  mentionablesForSuggestion: ComputedRef<User[]>;
}): any[] {
  const mentionSuggestion = buildMentionSuggestion(args.mentionablesForSuggestion);
  const base = [
    ...createRichTextExtensions({
      linkOpenOnClick: false,
      lowlight: epicStoryLowlight,
      codeBlockNodeView: TiptapCodeBlockCardNodeView,
      images: false,
    }),
  ];
  base.push(
    createMentionExtensionWithNodeView(TiptapMentionNodeView, {
      HTMLAttributes: {
        class:
          "mention-chip inline-flex items-center px-0.5 rounded-sm bg-mention-chip text-mention font-medium",
      },
      renderText({ node }: { node: { attrs: { label?: unknown; id?: unknown } } }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      userById: (id: number) => args.mentionablesById.value.get(id),
      mentionContext: args.mentionContext,
      suggestion: mentionSuggestion,
    } as any),
    createPlaceholderExtension(() => args.getPlaceholder()),
  );
  return base;
}
