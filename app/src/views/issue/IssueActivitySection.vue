<script lang="ts" setup>
import IssueCommentCard from "@/components/issue/IssueCommentCard.vue";
import { Icon } from "@/design-system/icons";
import { UserAvatar } from "@/components/user";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi } from "@/domain/issues/api";
import type { JSONContent } from "@tiptap/core";
import type { IssueFeed, IssueFeedItem } from "@/domain/issues/types/issue-feed.type";
import type { IMessage, IReply } from "@/domain/channels";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import type { User } from "@/domain/auth";
import { formatDistanceToNow } from "date-fns";
import { computed, reactive, ref, watch } from "vue";
import { cn } from "@/design-system/utils";
import { MessageComposer } from "@/components/messages";

const props = defineProps<{
  issueId: number;
  commentChannelId: number;
  meId: number;
}>();

/** Board / filter copy — keep in sync with project views. */
const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "In progress",
  done: "Done",
};

const PRIORITY_LABEL: Record<number, string> = {
  0: "No priority",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

function formatStatusKey(key: string | null | undefined): string | null {
  if (key == null || key === "") return null;
  return STATUS_LABEL[key] ?? key;
}

function formatPriorityValue(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return PRIORITY_LABEL[v] ?? `Priority ${v}`;
}

function formatDueIso(iso: string | null | undefined): string | null {
  if (iso == null || iso === "") return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

function readPayload(item: IssueFeedItem): Record<string, unknown> | null {
  const raw = item.payload;
  if (raw == null || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

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
  contentRich: JSONContent;
  attachmentIds?: number[];
}) {
  await issueApi.postIssueComment(props.issueId, {
    content: payload.content,
    contentRich: payload.contentRich,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  await reloadAfterComment();
}

async function onReplyInThread(
  parentMessageId: number,
  payload: { content: string; contentRich: JSONContent; attachmentIds?: number[] },
) {
  await issueApi.replyToIssueComment(props.issueId, parentMessageId, {
    content: payload.content,
    contentRich: payload.contentRich,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  await reloadAfterComment();
}

function joinEnglishList(parts: string[]): string {
  const xs = parts.filter((s) => s.trim() !== "");
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

function resolveAddedAssigneeNames(p: Record<string, unknown> | null): string[] {
  if (!p) return [];
  const fromPayload = (p.addedUserNames as unknown[] | undefined)?.filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  if (fromPayload?.length) return fromPayload;
  const ids = (p.addedUserIds as unknown[] | undefined)?.filter((x): x is number => typeof x === "number");
  if (!ids?.length) return [];
  return ids
    .map((id) => peersById.value.get(id)?.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

function resolveRemovedAssigneeNames(p: Record<string, unknown> | null): string[] {
  if (!p) return [];
  const fromPayload = (p.removedUserNames as unknown[] | undefined)?.filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  if (fromPayload?.length) return fromPayload;
  const ids = (p.removedUserIds as unknown[] | undefined)?.filter((x): x is number => typeof x === "number");
  if (!ids?.length) return [];
  return ids
    .map((id) => peersById.value.get(id)?.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

function resolveLabelNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

/** One plain sentence: "Ada changed status to Done", "Harry added Feature label". */
function activityFullSentence(item: IssueFeedItem): string {
  const actor = actorUser(item);
  const name = actor.name;
  const p = readPayload(item);

  switch (item.type) {
    case "issue_created":
      return `${name} created this issue`;
    case "comment_created":
      return `${name} posted a comment`;
    case "title_changed": {
      const nextRaw = p?.newTitle;
      const prevRaw = p?.previousTitle;
      const next = typeof nextRaw === "string" ? nextRaw : null;
      const prev = typeof prevRaw === "string" ? prevRaw : null;
      if (next && prev && next !== prev) return `${name} changed title from “${prev}” to “${next}”`;
      if (next) return `${name} changed title to “${next}”`;
      return `${name} changed the title`;
    }
    case "description_changed": {
      if (p?.changeKind === "cleared") return `${name} cleared the description`;
      const ex = typeof p?.excerpt === "string" ? p.excerpt.trim() : "";
      if (ex) return `${name} updated the description — ${ex.length > 160 ? `${ex.slice(0, 160)}…` : ex}`;
      return `${name} updated the description`;
    }
    case "status_changed": {
      const next = formatStatusKey(typeof p?.newStatus === "string" ? p.newStatus : null);
      if (next) return `${name} changed status to ${next}`;
      return `${name} changed status`;
    }
    case "priority_changed": {
      const next = typeof p?.newPriority === "number" ? formatPriorityValue(p.newPriority) : null;
      if (next) return `${name} changed priority to ${next}`;
      return `${name} changed priority`;
    }
    case "due_date_changed": {
      const prev = formatDueIso(typeof p?.previousDueDate === "string" ? p.previousDueDate : null);
      const next = formatDueIso(typeof p?.newDueDate === "string" ? p.newDueDate : null);
      if (next && prev && prev !== next) return `${name} changed due date to ${next}`;
      if (next && !prev) return `${name} set due date to ${next}`;
      if (!next && prev) return `${name} removed the due date`;
      return `${name} updated the due date`;
    }
    case "assignees_changed": {
      const added = resolveAddedAssigneeNames(p);
      const removed = resolveRemovedAssigneeNames(p);
      if (added.length && removed.length)
        return `${name} added assignees ${joinEnglishList(added)} and removed assignees ${joinEnglishList(removed)}`;
      if (added.length === 1) return `${name} added ${added[0]} as assignee`;
      if (added.length > 1) return `${name} added ${joinEnglishList(added)} as assignees`;
      if (removed.length === 1) return `${name} removed ${removed[0]} as assignee`;
      if (removed.length > 1) return `${name} removed ${joinEnglishList(removed)} as assignees`;
      return `${name} updated assignees`;
    }
    case "labels_changed": {
      const added = resolveLabelNames(p?.addedLabelNames);
      const removed = resolveLabelNames(p?.removedLabelNames);
      if (added.length && removed.length)
        return `${name} added ${joinEnglishList(added)} and removed ${joinEnglishList(removed)}`;
      if (added.length === 1) return `${name} added ${added[0]} label`;
      if (added.length > 1) return `${name} added ${joinEnglishList(added)} labels`;
      if (removed.length === 1) return `${name} removed ${removed[0]} label`;
      if (removed.length > 1) return `${name} removed ${joinEnglishList(removed)} labels`;
      return `${name} updated labels`;
    }
    case "parent_changed": {
      const prevRaw = p?.previousParentIssueId;
      const nextRaw = p?.newParentIssueId;
      const prev = typeof prevRaw === "number" ? prevRaw : null;
      const next = typeof nextRaw === "number" ? nextRaw : null;
      if (next != null && prev != null && prev !== next)
        return `${name} changed parent issue from #${prev} to #${next}`;
      if (next != null) return `${name} set parent issue to #${next}`;
      if (prev != null) return `${name} removed parent issue (was #${prev})`;
      return `${name} updated parent issue`;
    }
    case "attachment_added":
      return `${name} attached a file`;
    default:
      return `${name} updated this issue`;
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
  const normPic = (pic: string | null | undefined) => (pic?.trim() ? pic : null);
  if (item.actor != null) {
    return { name: item.actor.name, picture: normPic(item.actor.picture) };
  }
  const picUser = (u: User) => normPic(u.picture);
  if (item.actorId != null) {
    const u = peersById.value.get(item.actorId);
    if (u) return { name: u.name, picture: picUser(u) };
  }
  return { name: "Someone", picture: null };
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
  return item.message?.id ?? null;
}

type IssueThreadState = {
  loading: boolean;
  expanded: boolean;
  /** Set after a successful fetch; `undefined` means not loaded yet. */
  fullReplies: IReply[] | undefined;
};

const threadByRootId = reactive(new Map<number, IssueThreadState>());

function ensureThreadState(rootId: number): IssueThreadState {
  const existing = threadByRootId.get(rootId);
  if (existing) return existing;
  const created: IssueThreadState = {
    loading: false,
    expanded: false,
    fullReplies: undefined,
  };
  threadByRootId.set(rootId, created);
  return created;
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
      s.fullReplies = await channels.findReplies(rootId);
    } catch {
      /* keep previews; user can retry */
    } finally {
      s.loading = false;
    }
  }

  if (s.fullReplies) s.expanded = true;
}

watch(
  () => props.issueId,
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
        const list = await channels.findReplies(rootId);
        const s = threadByRootId.get(rootId);
        if (s) s.fullReplies = list;
      } catch {
        /* leave stale cache */
      }
    }
  },
);
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
      <li v-for="(item, i) in filteredFeedItems" :key="item.activityId" class="flex min-w-0 items-stretch">
        <div v-if="item.type === 'comment_created' && item.message?.id" class="flex:col">
          <div
            v-if="filteredFeedItems[i - 1]?.type === 'comment_created'"
            :class="cn('ml-6 h-6 w-px shrink-0 bg-zinc-200')"
          />

          <div
            class="overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          >
            <IssueCommentCard :message="item.message" :me-id="meId" variant="threadSegment" />
            <button
              v-if="item.hasMoreOlder && hiddenReplyCount(item) > 0"
              type="button"
              class="flex w-full items-center justify-between gap-2 border-t border-zinc-200/70 px-4 py-2 text-left text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50/90 disabled:opacity-60"
              :aria-expanded="isExpandedThread(item)"
              :disabled="isLoadingThread(item)"
              @click="toggleThreadReplies(item)"
            >
              <span class="flex min-w-0 items-center gap-2">
                <template v-if="isExpandedThread(item)">Collapse</template>
                <template v-else>
                  {{ hiddenReplyCount(item) }}
                  earlier
                  {{ hiddenReplyCount(item) === 1 ? "reply" : "replies" }}
                </template>
                <span v-if="isLoadingThread(item)" class="text-zinc-400">Loading…</span>
              </span>
              <Icon
                :name="isExpandedThread(item) ? 'oi-chevron-up' : 'oi-chevron-down'"
                class="size-3.5 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
            </button>
            <IssueCommentCard
              v-for="(rep, repIdx) in displayedRepliesForItem(item)"
              :key="replyKey(rep, repIdx)"
              :message="asReply(rep)"
              :me-id="meId"
              variant="threadSegment"
              segment-divider
            />
            <div v-if="commentChannelId != null" class="border-t border-zinc-100 bg-zinc-50/60 p-2">
              <MessageComposer
                :key="`reply-${item.activityId}-${item.message.id}`"
                :channel-id="commentChannelId"
                :mentionables="channelPeers"
                :me-id="meId"
                placeholder="Leave a reply…"
                class="max-h-[min(36vh,20rem)] w-full max-w-full shrink-0 rounded-lg border-zinc-200/90 bg-white shadow-none"
                @send-message="onReplyInThread(item.message.id, $event)"
              />
            </div>
          </div>
        </div>

        <div v-else class="flex:col ml-4">
          <div
            :class="
              cn(
                'ml-1 mb-1 w-px shrink-0 bg-zinc-200',
                filteredFeedItems[i - 1]?.type === 'comment_created' ? 'h-5' : 'h-1.5',
                { 'opacity-0': i === 0 },
              )
            "
          />

          <div :class="cn('flex items-center gap-3')">
            <div class="size-2.5 shrink-0 rounded-full bg-violet-600 shadow-[0_0_0_3px_rgb(255_255_255)]" />
            <UserAvatar
              class="mt-0.5 shrink-0 ring-2 ring-white"
              :name="actorUser(item).name"
              :picture="actorUser(item).picture"
              size="sm"
            />
            <p class="min-w-0 flex-1 text-[13px] leading-snug text-zinc-800">
              {{ activityFullSentence(item) }}
              <span class="text-zinc-300"> · </span>
              <time class="text-zinc-500" :datetime="item.createdAt">{{ formatWhen(item.createdAt) }}</time>
            </p>
          </div>

          <div
            :class="
              cn(
                'ml-1 mt-1 w-px shrink-0 bg-zinc-200',
                filteredFeedItems[i + 1]?.type === 'comment_created' ? 'h-5' : 'h-1.5',
                { 'opacity-0': i === filteredFeedItems.length - 1 },
              )
            "
          />
        </div>
      </li>
      <li v-if="filteredFeedItems.length === 0" class="list-none py-2 text-[13px] text-zinc-500">
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
