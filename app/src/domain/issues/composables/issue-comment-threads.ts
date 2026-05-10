import type { IReply } from "@/domain/channels";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import type { IssueFeed, IssueFeedItem } from "@/domain/issues/types/issue-feed.type";
import { reactive, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";

export type IssueCommentThreadState = {
  loading: boolean;
  expanded: boolean;
  fullReplies: IReply[] | undefined;
};

export function useIssueCommentThreads(options: {
  feed: Ref<IssueFeed | null>;
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

  function messageRootId(item: IssueFeedItem): number | null {
    return item.message?.id ?? null;
  }

  function isLoadingThread(item: IssueFeedItem): boolean {
    const rootId = messageRootId(item);
    if (rootId == null) return false;
    return ensureThreadState(rootId).loading;
  }

  function isExpandedThread(item: IssueFeedItem): boolean {
    const rootId = messageRootId(item);
    if (rootId == null) return false;
    return ensureThreadState(rootId).expanded;
  }

  function hiddenReplyCount(item: IssueFeedItem): number {
    const total = item.repliesTotal ?? 0;
    const previewLen = item.replyPreviews?.length ?? 0;
    return Math.max(0, total - previewLen);
  }

  function displayedRepliesForItem(item: IssueFeedItem): IReply[] {
    const rootId = messageRootId(item);
    if (rootId == null) return item.replyPreviews;
    const s = ensureThreadState(rootId);
    if (item.hasMoreOlder && s.expanded && s.fullReplies) {
      return s.fullReplies;
    }
    return item.replyPreviews;
  }

  async function toggleThreadReplies(item: IssueFeedItem) {
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
        s.fullReplies = await channelApi.findReplies(rootId);
        onSyncReplies?.(s.fullReplies);
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
          const list = await channelApi.findReplies(rootId);
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
