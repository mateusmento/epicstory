import { toPaginatedListView } from "@/lib/async";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import type { IUser } from "@epicstory/contracts";

export function mapIssueMentionView(input: {
  mentionables: IUser[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error?: string | null;
  onlineUserIds?: ReadonlySet<number>;
}): MentionComposerView {
  return {
    mentionables: input.mentionables,
    list: toPaginatedListView({
      items: input.mentionables,
      loading: input.loading,
      loadingMore: input.loadingMore,
      hasMore: input.hasMore,
      error: input.error ?? null,
    }),
    onlineUserIds: input.onlineUserIds,
  };
}

/** Channel / modal: full roster, no forward pagination */
export function staticMentionView(
  mentionables: IUser[],
  onlineUserIds?: ReadonlySet<number>,
): MentionComposerView {
  return {
    mentionables,
    list: {
      items: mentionables,
      loading: false,
      loadingMore: false,
      hasMore: false,
      error: null,
    },
    onlineUserIds,
  };
}

export function onlineUserIdsFrom(peers: IUser[], isOnline: (id: number) => boolean): ReadonlySet<number> {
  return new Set(peers.filter((u) => isOnline(u.id)).map((u) => u.id));
}
