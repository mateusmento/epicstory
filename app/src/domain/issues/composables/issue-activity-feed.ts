import type { IUser as IUser } from "@epicstory/contracts";
import { ChannelApi } from "@epicstory/api-client";
import type { IMessage } from "@epicstory/contracts";
import type { IssueApi } from "@epicstory/api-client";
import type { IssueAttachmentActivitySyncPayload } from "./issue-attachments";
import type { IIssueFeed } from "@epicstory/contracts";
import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";

export function useIssueActivityFeed(options: {
  issueId: MaybeRefOrGetter<number>;
  commentChannelId: MaybeRefOrGetter<number>;
  tab: Ref<"all" | "comments">;
  issueApi: IssueApi;
  channelApi: ChannelApi;
  onSyncAttachments?: (payload: IssueAttachmentActivitySyncPayload) => void;
}) {
  const { issueApi, channelApi, tab, onSyncAttachments } = options;

  const feed = ref<IIssueFeed | null>(null);
  const commentMessages = ref<IMessage[]>([]);
  const channelPeers = ref<IUser[]>([]);
  const loading = ref(false);
  const loadError = ref<string | null>(null);

  const peersById = computed(() => new Map(channelPeers.value.map((u) => [u.id, u])));

  watch(
    () => toValue(options.commentChannelId),
    async (id) => {
      try {
        channelPeers.value = await channelApi.findMembers(id);
      } catch {
        channelPeers.value = [];
      }
    },
    { immediate: true },
  );

  const filteredFeedItems = computed(() => feed.value?.items ?? []);

  watch(
    [() => toValue(options.issueId), () => toValue(options.commentChannelId), tab] as const,
    async ([issueId, channelId, currentTab], prev) => {
      const isInitial = prev === undefined;
      const issueChanged = isInitial || prev[0] !== issueId;
      const channelChanged = isInitial || prev[1] !== channelId;
      const tabChanged = isInitial || prev[2] !== currentTab;
      const primaryChanged = issueChanged || channelChanged || tabChanged;

      if (primaryChanged) {
        loading.value = true;
        loadError.value = null;
      }
      try {
        if (currentTab === "all") {
          feed.value = await issueApi.fetchIssueFeed(issueId, 50);
          onSyncAttachments?.({ feedItems: feed.value.items });
        } else if (channelId != null) {
          commentMessages.value = await channelApi.findMessages(channelId);
          onSyncAttachments?.({ topLevelMessages: commentMessages.value });
        } else {
          commentMessages.value = [];
        }
      } catch (e: unknown) {
        loadError.value = e instanceof Error ? e.message : "Failed to load activity";
      } finally {
        if (primaryChanged) {
          loading.value = false;
        }
      }
    },
    { immediate: true },
  );

  async function reloadAfterComment() {
    const id = toValue(options.issueId);
    feed.value = await issueApi.fetchIssueFeed(id, 50);
    onSyncAttachments?.({ feedItems: feed.value.items });
    if (tab.value === "comments" && toValue(options.commentChannelId) != null) {
      const channelId = toValue(options.commentChannelId);
      commentMessages.value = await channelApi.findMessages(channelId);
      onSyncAttachments?.({ topLevelMessages: commentMessages.value });
    }
  }

  return {
    feed,
    commentMessages,
    channelPeers,
    loading,
    loadError,
    peersById,
    filteredFeedItems,
    reloadAfterComment,
  };
}
