import { Lowlight } from "@/core/lowlight";
import { createFloatingSuggestion } from "@/core/tiptap";
import type { IUser as IUser } from "@epicstory/contracts";
import {
  createMentionExtensionWithNodeView,
  createPlaceholderExtension,
  createRichTextExtensions,
} from "@epicstory/tiptap/vue";
import type { ComputedRef } from "vue";
import type { MentionSuggestionItem } from "./mention-suggestion.types";
import MentionList from "./node-views/MentionList.vue";
import CodeBlockCardNodeView from "./node-views/CodeBlockCardNodeView.vue";
import MentionNodeView from "./node-views/MentionNodeView.vue";

export type { MentionSuggestionItem } from "./mention-suggestion.types";

export const EPICSTORY_RICH_TEXT_COMPOSER = "epicstory-rich-text epicstory-rich-text-composer";

export function buildMentionSuggestion(
  mentionablesForSuggestion: ComputedRef<IUser[]>,
  options?: {
    getOnMentionListReachedBottom?: () => (() => void | Promise<void>) | undefined;
    getMentionListHasMore?: () => boolean;
    getMentionListLoadingMore?: () => boolean;
    getIsUserOnline?: () => ((userId: number) => boolean) | undefined;
  },
) {
  return createFloatingSuggestion({
    items: ({ query }): MentionSuggestionItem[] => {
      const q = (query ?? "").trim().toLowerCase();
      return mentionablesForSuggestion.value
        .filter((u) => (q ? u.name.toLowerCase().includes(q) || String(u.id).startsWith(q) : true))
        .map((u) => ({ id: u.id, label: u.name, picture: u.picture }));
    },
    listComponent: MentionList,
    mapProps: ({ items, command }) => ({
      items,
      command,
      onReachedBottom: options?.getOnMentionListReachedBottom?.(),
      hasMore: options?.getMentionListHasMore?.() ?? true,
      isLoadingMore: options?.getMentionListLoadingMore?.() ?? false,
      isUserOnline: options?.getIsUserOnline?.(),
    }),
    placement: "bottom-start",
    mainAxisOffset: 8,
    zIndex: 80,
    className: "outline-none",
  });
}

/**
 * Composer TipTap bodies for channel-style messages: text + mentions + code blocks + embedded images (insert action).
 * Clipboard/dropped files are handled by the shell ({@link RichTextComposer} → staging), not TipTap FileHandler.
 */
export function createRichTextComposerExtensions(args: {
  getPlaceholder: () => string;
  mentionContext: { meId: number | undefined };
  mentionablesById: ComputedRef<Map<number, IUser>>;
  mentionablesForSuggestion: ComputedRef<IUser[]>;
  getOnMentionListReachedBottom?: () => (() => void | Promise<void>) | undefined;
  getMentionListHasMore?: () => boolean;
  getMentionListLoadingMore?: () => boolean;
  getIsUserOnline?: () => ((userId: number) => boolean) | undefined;
}): any[] {
  const mentionSuggestion = buildMentionSuggestion(args.mentionablesForSuggestion, {
    getOnMentionListReachedBottom: args.getOnMentionListReachedBottom,
    getMentionListHasMore: args.getMentionListHasMore,
    getMentionListLoadingMore: args.getMentionListLoadingMore,
    getIsUserOnline: args.getIsUserOnline,
  });
  const base = [
    ...createRichTextExtensions({
      linkOpenOnClick: false,
      lowlight: Lowlight,
      codeBlockNodeView: CodeBlockCardNodeView,
      images: true,
    }),
  ];
  base.push(
    createMentionExtensionWithNodeView(MentionNodeView, {
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
