import { ChannelApi } from "@epicstory/api-client";
import type { IReply } from "@epicstory/contracts";
import { reactive, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";
import type { IIssueFeed, IIssueFeedItem } from "@epicstory/contracts";

export type IssueCommentThreadState = {
  loading: boolean;
  expanded: boolean;
  fullReplies: IReply[] | undefined;
};

export function useIssueCommentThreads(options: {
  feed: Ref<IIssueFeed | null>;
  tab: Ref<"all" | "comments">;
  issueId: MaybeRefOrGetter<number>;
  channelApi: ChannelApi;
  onSyncReplies?: (replies: IReply[]) => void;
}) {
  const { feed, tab, channelApi, onSyncReplies } = options;

  const threadByRootId = reactive(new Map<number, IssueCommentThreadState>());

  function ensureThreadState(rootId: number): IssueCommentThreadState {
    const existing = threadByRootId.get(rootId);
    if (existing) return existing;
    const created: IssueCommentThreadState = {
      loading: false,
      expanded: false,
      fullReplies: undefined,
    };
    threadByRootId.set(rootId, created);
    return created;
  }

  function messageRootId(item: IIssueFeedItem): number | null {
    return item.message?.id ?? null;
  }

  function isLoadingThread(item: IIssueFeedItem): boolean {
    const rootId = messageRootId(item);
    if (rootId == null) return false;
    return ensureThreadState(rootId).loading;
  }

  function isExpandedThread(item: IIssueFeedItem): boolean {
    const rootId = messageRootId(item);
    if (rootId == null) return false;
    return ensureThreadState(rootId).expanded;
  }

  function hiddenReplyCount(item: IIssueFeedItem): number {
    const total = item.repliesTotal ?? 0;
    const previewLen = item.replyPreviews?.length ?? 0;
    return Math.max(0, total - previewLen);
  }

  function displayedRepliesForItem(item: IIssueFeedItem): IReply[] {
    const previews = item.replyPreviews ?? [];
    const rootId = messageRootId(item);
    if (rootId == null) return previews;
    const s = ensureThreadState(rootId);
    if (item.hasMoreOlder && s.expanded && s.fullReplies) {
      return s.fullReplies;
    }
    return previews;
  }

  async function toggleThreadReplies(item: IIssueFeedItem) {
    const rootId = messageRootId(item);
    if (rootId == null || !item.hasMoreOlder) return;

    const s = ensureThreadState(rootId);

    if (s.expanded) {
      s.expanded = false;
      return;
    }

    if (!s.fullReplies) {
      s.loading = true;
      try {
        const page = await channelApi.findReplies(rootId, { full: true });
        const replies = page.content;
        s.fullReplies = replies;
        onSyncReplies?.(replies);
      } catch {
        /* keep previews; user can retry */
      } finally {
        s.loading = false;
      }
    }

    if (s.fullReplies) s.expanded = true;
  }

  watch(
    () => toValue(options.issueId),
    () => {
      threadByRootId.clear();
    },
  );

  watch(
    () => feed.value,
    async (f) => {
      if (tab.value !== "all") return;
      if (!f?.items?.length) return;
      const expandedIds = [...threadByRootId.entries()].filter(([, s]) => s.expanded).map(([id]) => id);
      for (const rootId of expandedIds) {
        try {
          const page = await channelApi.findReplies(rootId, { full: true });
          const list = page.content;
          const s = threadByRootId.get(rootId);
          if (s) {
            s.fullReplies = list;
            onSyncReplies?.(list);
          }
        } catch {
          /* leave stale cache */
        }
      }
    },
  );

  function replyKey(rep: unknown, index: number): string | number {
    if (
      rep != null &&
      typeof rep === "object" &&
      "id" in rep &&
      typeof (rep as { id?: unknown }).id === "number"
    ) {
      return (rep as { id: number }).id;
    }
    return index;
  }

  return {
    threadByRootId,
    ensureThreadState,
    messageRootId,
    isLoadingThread,
    isExpandedThread,
    hiddenReplyCount,
    displayedRepliesForItem,
    toggleThreadReplies,
    replyKey,
  };
}
