<script lang="ts" setup>
import IssueCommentCard from "@/components/issue/IssueCommentCard.vue";
import MessageComposer from "@/components/channel/MessageComposer.vue";
import { Icon } from "@/design-system/icons";
import { UserAvatar } from "@/components/user";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi } from "@/domain/issues/api";
import type { IssueFeed, IssueFeedItem } from "@/domain/issues/types/issue-feed.type";
import type { IMessage, IReply } from "@/domain/channels";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import type { User } from "@/domain/auth";
import { formatDistanceToNow } from "date-fns";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  issueId: number;
  commentChannelId: number | null;
  workspaceId: number;
  /** Current user — enables typing indicators + mentions. */
  meId: number;
}>();

const issueApi = useDependency(IssueApi);
const channels = useDependency(ChannelApi);

const tab = ref<"all" | "comments">("all");
const feed = ref<IssueFeed | null>(null);
const commentMessages = ref<IMessage[]>([]);
const channelPeers = ref<User[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);

const peersById = computed(() => new Map(channelPeers.value.map((u) => [u.id, u])));

watch(
  () => props.commentChannelId,
  async (id) => {
    if (id == null) {
      channelPeers.value = [];
      return;
    }
    try {
      channelPeers.value = await channels.findMembers(id);
    } catch {
      channelPeers.value = [];
    }
  },
  { immediate: true },
);

const filteredFeedItems = computed(() => feed.value?.items ?? []);

watch(
  [() => props.issueId, () => props.commentChannelId, tab],
  async () => {
    loading.value = true;
    loadError.value = null;
    try {
      if (tab.value === "all") {
        feed.value = await issueApi.fetchIssueFeed(props.issueId, 50);
      } else if (props.commentChannelId != null) {
        commentMessages.value = await channels.findMessages(props.commentChannelId);
      } else {
        commentMessages.value = [];
      }
    } catch (e: unknown) {
      loadError.value = e instanceof Error ? e.message : "Failed to load activity";
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

async function reloadAfterComment() {
  feed.value = await issueApi.fetchIssueFeed(props.issueId, 50);
  if (tab.value === "comments" && props.commentChannelId != null) {
    commentMessages.value = await channels.findMessages(props.commentChannelId);
  }
}

async function onPostIssueComment(payload: {
  content: string;
  contentRich: unknown;
  attachmentIds?: number[];
}) {
  await issueApi.postIssueComment(props.issueId, {
    content: payload.content,
    contentRich: payload.contentRich as Record<string, unknown> | undefined,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  await reloadAfterComment();
}

async function onReplyInThread(
  parentMessageId: number,
  payload: { content: string; contentRich: unknown; attachmentIds?: number[] },
) {
  await issueApi.replyToIssueComment(props.issueId, parentMessageId, {
    content: payload.content,
    contentRich: payload.contentRich as Record<string, unknown> | undefined,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  await reloadAfterComment();
}

/** Linear-style verb only (name rendered separately). */
function summarizeActivity(row: IssueFeedItem): string {
  switch (row.type) {
    case "issue_created":
      return "created the issue";
    case "comment_created":
      return "posted a comment";
    case "title_changed":
      return "changed the title";
    case "description_changed":
      return "edited the description";
    case "status_changed":
      return "changed status";
    case "priority_changed":
      return "changed priority";
    case "due_date_changed":
      return "updated the due date";
    case "assignees_changed":
      return "updated assignees";
    case "labels_changed":
      return "updated labels";
    case "parent_changed":
      return "changed parent issue";
    case "attachment_added":
      return "attached a file";
    default:
      return row.type;
  }
}

function activityIcon(t: IssueFeedItem["type"]): string {
  switch (t) {
    case "issue_created":
      return "io-add-circle-outline";
    case "comment_created":
      return "fa-comment";
    case "title_changed":
    case "description_changed":
      return "fa-regular-edit";
    case "status_changed":
    case "priority_changed":
    case "due_date_changed":
      return "fa-info-circle";
    case "assignees_changed":
      return "fa-user-plus";
    case "labels_changed":
      return "fa-tag";
    case "parent_changed":
      return "fa-folder";
    case "attachment_added":
      return "fa-paperclip";
    default:
      return "fa-info-circle";
  }
}

function formatWhen(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function actorUser(item: IssueFeedItem): { name: string; picture: string | null } {
  const picture = (u: User) => (u.picture?.trim() ? u.picture : null);
  if (item.actorId != null) {
    const u = peersById.value.get(item.actorId);
    if (u) return { name: u.name, picture: picture(u) };
  }
  return { name: "Someone", picture: null };
}

function asRootMessage(item: IssueFeedItem): IMessage | null {
  const m = item.message;
  if (!m || typeof m !== "object") return null;
  return m as IMessage;
}

function asReply(rep: unknown): IReply {
  return rep as IReply;
}

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

function messageRootId(item: IssueFeedItem): number | null {
  return asRootMessage(item)?.id ?? null;
}
</script>

<template>
  <section class="mt-10 flex flex-col gap-6 border-t border-zinc-200/80 pt-8">
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-[13px] font-semibold tracking-tight text-zinc-900">Activity</h2>
      <div class="flex rounded-md bg-zinc-100/90 p-0.5">
        <button
          type="button"
          class="rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors"
          :class="tab === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'"
          @click="tab = 'all'"
        >
          All
        </button>
        <button
          type="button"
          class="rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors"
          :class="
            tab === 'comments' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          "
          @click="tab = 'comments'"
        >
          Comments
        </button>
      </div>
    </div>

    <div v-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <div v-else-if="loading" class="text-[13px] text-zinc-500">Loading…</div>

    <ul v-else-if="tab === 'all'" class="flex list-none flex-col">
      <li
        v-for="(item, i) in filteredFeedItems"
        :key="item.activityId"
        class="min-w-0"
        :class="item.type === 'comment_created' && asRootMessage(item) ? 'pb-8' : ''"
      >
        <template v-if="item.type === 'comment_created' && asRootMessage(item)">
          <div
            class="overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          >
            <IssueCommentCard :message="asRootMessage(item)!" :me-id="meId" variant="threadSegment" />
            <IssueCommentCard
              v-for="(rep, repIdx) in item.replyPreviews"
              :key="replyKey(rep, repIdx)"
              :message="asReply(rep)"
              :me-id="meId"
              variant="threadSegment"
              segment-divider
            />
            <div
              v-if="item.hasMoreOlder"
              class="border-t border-zinc-200/70 px-4 py-2 text-[12px] text-zinc-500"
            >
              More replies in thread…
            </div>
            <div
              v-if="commentChannelId != null && messageRootId(item) != null"
              class="border-t border-zinc-100 bg-zinc-50/60 p-2"
            >
              <MessageComposer
                :key="`reply-${item.activityId}-${messageRootId(item)}`"
                :channel-id="commentChannelId"
                :workspace-id="workspaceId"
                :mentionables="channelPeers"
                :me-id="meId"
                placeholder="Leave a reply…"
                class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-none"
                @send-message="(e) => onReplyInThread(messageRootId(item)!, e)"
              />
            </div>
          </div>
        </template>

        <div v-else class="flex gap-3" :class="i === filteredFeedItems.length - 1 ? '!pb-2' : ''">
          <div class="flex w-6 shrink-0 flex-col items-center self-stretch">
            <UserAvatar
              class="z-[1] ring-2 ring-white"
              :name="actorUser(item).name"
              :picture="actorUser(item).picture"
              size="sm"
            />
            <div
              v-if="i < filteredFeedItems.length - 1"
              class="mt-1.5 w-px flex-1 bg-zinc-200/90"
              style="min-height: 4px"
              aria-hidden="true"
            />
          </div>
          <div class="min-w-0 flex-1 pt-0.5">
            <div class="flex gap-2">
              <Icon :name="activityIcon(item.type)" class="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
              <p class="text-[13px] leading-snug">
                <span class="font-semibold text-zinc-900">{{ actorUser(item).name }}</span>
                <span class="text-zinc-600">
                  {{ " " + summarizeActivity(item) }}
                </span>
                <span class="text-zinc-300"> · </span>
                <time class="font-normal text-zinc-500" :datetime="item.createdAt">
                  {{ formatWhen(item.createdAt) }}
                </time>
              </p>
            </div>
          </div>
        </div>
      </li>
      <li v-if="filteredFeedItems.length === 0" class="list-none text-[13px] text-zinc-500">
        No activity yet.
      </li>
    </ul>

    <ul v-else class="flex list-none flex-col gap-4">
      <li v-for="msg in commentMessages" :key="msg.id">
        <IssueCommentCard :message="msg" :me-id="meId" />
      </li>
      <li v-if="commentMessages.length === 0" class="text-[13px] text-zinc-500">No comments yet.</li>
    </ul>

    <div v-if="commentChannelId != null" class="rounded-lg border border-zinc-200/90 bg-zinc-50/40 p-2">
      <MessageComposer
        :channel-id="commentChannelId"
        :workspace-id="workspaceId"
        :mentionables="channelPeers"
        :me-id="meId"
        placeholder="Leave a comment…"
        class="max-h-[min(40vh,22rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        @send-message="onPostIssueComment"
      />
    </div>
    <div v-else class="text-[12px] text-zinc-500">Comment channel is initializing — refresh in a moment.</div>
  </section>
</template>
