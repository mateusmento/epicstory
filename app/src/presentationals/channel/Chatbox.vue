<script lang="ts" setup>
import { UserAvatar, UserAvatarStack } from "@/presentationals/user";
import {
  Button,
  ButtonGroup,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  ScrollArea,
  Separator,
} from "@/design-system";
import type { ChatTimelineItem } from "@/lib/chat-timeline";
import { chatTimelineRowCount } from "@/lib/chat-timeline";
import { enumerateNames } from "@/utils";
import type {
  IChannel,
  IChannelActivity,
  CreateScheduledMessageBody as ICreateScheduledMessageBody,
  IMessage,
  MessagePollBody,
} from "@epicstory/contracts";
import { useVirtualizer } from "@tanstack/vue-virtual";
import type { JSONContent } from "@tiptap/core";
import { useThrottleFn } from "@vueuse/core";
import { CalendarClockIcon, ChevronDownIcon, HashIcon, HeadphonesIcon } from "lucide-vue-next";
import type { VNodeRef } from "vue";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import type { OlderPageState } from "@/lib/async";
import ChannelActivityRow from "@/presentationals/channel/ChannelActivityRow.vue";
import MessageGroup from "@/presentationals/channel/MessageGroup.vue";

const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  chatTimeline: ChatTimelineItem[];
  sendMessage: (message: {
    content: JSONContent;
    quotedMessageId?: number;
    attachmentIds?: number[];
    poll?: MessagePollBody;
  }) => Promise<unknown>;
  sendScheduledMessage?: (body: ICreateScheduledMessageBody) => Promise<unknown>;
  updateMessage: (
    messageId: number,
    body: { content: JSONContent; attachmentIds?: number[]; poll?: MessagePollBody | null },
  ) => Promise<unknown>;
  channelId: number;
  channel: IChannel;
  typingUserIds: number[];
  olderPage: OlderPageState;
  loadOlderActivitiesPage: () => Promise<void>;
  isUserOnline: (userId: number) => boolean;
  isMeetingJoinable: (meeting: NonNullable<IChannel["meeting"]>) => boolean;
}>();

const emit = defineEmits<{
  (e: "join-meeting", meetingId: number): void;
  (e: "join-channel-meeting"): void;
  (e: "start-meeting"): void;
  (e: "schedule-meeting"): void;
  (e: "more-details"): void;
  (e: "message-deleted", messageId: number): void;
}>();

function canJoinMeetingFromActivity(activity: IChannelActivity) {
  if (activity.type !== "meeting_started") return false;
  const meetingId = activity.meetingId;
  const live = props.channel.meeting;
  if (!live || !meetingId || live.id !== meetingId) return false;
  return props.isMeetingJoinable(live);
}

function meetingAttendeesFromActivity(activity: IChannelActivity) {
  if (!canJoinMeetingFromActivity(activity)) return [];
  return props.channel.meeting?.attendees.map((a) => a.user) ?? [];
}

const quotedMessage = ref<IMessage | null>(null);
const editingMessage = ref<IMessage | null>(null);

/** Clear reply-to when that message is removed (local delete, websocket, or channel switch). */
const channelMessageIds = computed(() => {
  return new Set(
    props.chatTimeline.flatMap((item) =>
      item.kind === "messages" ? item.group.messages.map((m) => m.id) : [],
    ),
  );
});

watch([channelMessageIds, quotedMessage], ([ids, q]) => {
  if (!q) return;
  if (!ids.has(q.id)) {
    quotedMessage.value = null;
  }
});
const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null);

const introEl = ref<HTMLElement | null>(null);
const introHeight = ref(0);
let introResizeObserver: ResizeObserver | null = null;

function timelineRowKey(item: ChatTimelineItem) {
  return item.kind === "messages" ? `g-${item.group.id}` : `a-${item.activity.id}`;
}

function messageRow(index: number): Extract<ChatTimelineItem, { kind: "messages" }> | undefined {
  const item = props.chatTimeline[index];
  return item?.kind === "messages" ? item : undefined;
}

function activityRow(index: number): Extract<ChatTimelineItem, { kind: "activity" }> | undefined {
  const item = props.chatTimeline[index];
  return item?.kind === "activity" ? item : undefined;
}

function timelineRowKeyAt(index: number) {
  const item = props.chatTimeline[index];
  return item ? timelineRowKey(item) : String(index);
}

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.chatTimeline.length,
    getScrollElement: () => scrollAreaRef.value?.getScrollElement() ?? null,
    estimateSize: () => 150,
    overscan: 8,
    paddingStart: introHeight.value,
    scrollPaddingStart: introHeight.value,
    getItemKey: (index: number) => {
      const item = props.chatTimeline[index];
      return item ? timelineRowKey(item) : index;
    },
  })),
);

const measureTimelineRow: VNodeRef = (el) => {
  rowVirtualizer.value.measureElement(el as HTMLElement | null);
};

watch(
  introEl,
  (el) => {
    introResizeObserver?.disconnect();
    introResizeObserver = null;
    if (!el) {
      introHeight.value = 0;
      return;
    }
    const ro = new ResizeObserver(() => {
      introHeight.value = Math.round(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    introHeight.value = Math.round(el.getBoundingClientRect().height);
    introResizeObserver = ro;
  },
  { flush: "post" },
);

const prependBusy = ref(false);

async function loadOlderWithScrollPreserve() {
  if (prependBusy.value || !props.olderPage.hasOlder || props.olderPage.loadingOlder) return;
  prependBusy.value = true;
  const el = scrollAreaRef.value?.getScrollElement();
  if (!el) {
    prependBusy.value = false;
    return;
  }
  const prevScrollHeight = el.scrollHeight;
  const prevScrollTop = el.scrollTop;
  try {
    await props.loadOlderActivitiesPage();
  } finally {
    await nextTick();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const v = scrollAreaRef.value?.getScrollElement();
        if (v) {
          v.scrollTop = prevScrollTop + (v.scrollHeight - prevScrollHeight);
        }
        prependBusy.value = false;
      });
    });
  }
}

const NEAR_TOP_PX = 200;

const onViewportScroll = useThrottleFn(() => {
  const el = scrollAreaRef.value?.getScrollElement();
  if (!el || el.scrollTop > NEAR_TOP_PX) return;
  if (!props.olderPage.hasOlder || props.olderPage.loadingOlder || prependBusy.value) return;
  loadOlderWithScrollPreserve();
}, 100);

watch(
  scrollAreaRef,
  (area, prev) => {
    const prevEl = prev?.getScrollElement?.() ?? null;
    if (prevEl) prevEl.removeEventListener("scroll", onViewportScroll);
    const el = area?.getScrollElement?.() ?? null;
    if (el) el.addEventListener("scroll", onViewportScroll, { passive: true });
  },
  { immediate: true },
);

onUnmounted(() => {
  introResizeObserver?.disconnect();
  scrollAreaRef.value?.getScrollElement?.()?.removeEventListener("scroll", onViewportScroll);
});

function timelineEndCursor(timeline: ChatTimelineItem[]): string | null {
  const last = timeline[timeline.length - 1];
  if (!last) return null;
  if (last.kind === "messages") {
    const m = last.group.messages[last.group.messages.length - 1];
    if (!m) return null;
    return `${new Date(m.sentAt as unknown as string).getTime()}\0${m.id}`;
  }
  const a = last.activity;
  return `${new Date(a.createdAt).getTime()}\0${a.id}`;
}

const onlineUsers = computed(() =>
  props.channel.peers.filter((p) => p.id !== props.meId && props.isUserOnline(p.id)),
);

const typingPeerNames = computed(() => {
  const ids = props.typingUserIds.filter((id) => id !== props.meId);
  return ids
    .map((id) => props.channel.peers.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n));
});

const typingBannerText = computed(() => {
  const names = enumerateNames(typingPeerNames.value);
  if (typingPeerNames.value.length > 1) return `${names} are typing…`;
  if (typingPeerNames.value.length === 1) return `${names} is typing…`;
  return "";
});

const prevMessageTotal = ref(-1);
/** Tracks newest timeline leaf; unchanged when older rows are prepended. */
const prevTimelineEndCursor = ref<string | null>(null);

watch(
  () => props.channelId,
  () => {
    prevMessageTotal.value = -1;
    prevTimelineEndCursor.value = null;
  },
);

watch(
  () => chatTimelineRowCount(props.chatTimeline),
  (totalRows) => {
    const endCur = timelineEndCursor(props.chatTimeline);
    const prev = prevMessageTotal.value;
    if (prev < 0) {
      prevMessageTotal.value = totalRows;
      prevTimelineEndCursor.value = endCur;
      if (totalRows > 0) nextTick(() => scrollAreaRef.value?.scrollToBottom());
      return;
    }
    if (totalRows > prev) {
      const prevEnd = prevTimelineEndCursor.value;
      prevMessageTotal.value = totalRows;
      prevTimelineEndCursor.value = endCur;
      // Prepending history increases row count but leaves the newest item unchanged.
      if (endCur !== prevEnd) {
        nextTick(() => scrollAreaRef.value?.scrollToBottom());
      }
    } else {
      prevMessageTotal.value = totalRows;
      prevTimelineEndCursor.value = endCur;
    }
  },
);

async function onSendMessage(payload: {
  content: JSONContent;
  quotedMessageId?: number;
  attachmentIds?: number[];
  poll?: MessagePollBody;
}) {
  await props.sendMessage({
    content: payload.content,
    quotedMessageId: payload.quotedMessageId ?? (quotedMessage.value ? quotedMessage.value.id : undefined),
    attachmentIds: payload.attachmentIds,
    ...(payload.poll ? { poll: payload.poll } : {}),
  });
  scrollAreaRef.value?.scrollToBottom();
  quotedMessage.value = null;
}

async function onSendScheduledMessage(payload: ICreateScheduledMessageBody) {
  const send = props.sendScheduledMessage;
  if (send) {
    await send(payload);
  }
  scrollAreaRef.value?.scrollToBottom();
  quotedMessage.value = null;
}

async function onSubmitEdit(payload: {
  messageId: number;
  content: JSONContent;
  attachmentIds?: number[];
  poll?: MessagePollBody | null;
}) {
  await props.updateMessage(payload.messageId, {
    content: payload.content,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
    ...(payload.poll !== undefined ? { poll: payload.poll } : {}),
  });
  editingMessage.value = null;
}

function onCancelEdit() {
  editingMessage.value = null;
}

function onQuote(m: IMessage | undefined) {
  if (!m || "messageId" in m) return;
  quotedMessage.value = m;
  editingMessage.value = null;
}

function onStartEdit(m: IMessage | undefined) {
  if (!m || "messageId" in m) return;
  editingMessage.value = m;
  quotedMessage.value = null;
}

function onMessageDeleted(messageId: number) {
  emit("message-deleted", messageId);
}

defineExpose({
  scrollMessagesToBottom: () => scrollAreaRef.value?.scrollToBottom(),
});
</script>

<template>
  <div class="grid grid-rows-[auto_auto_1fr_auto] h-full">
    <div class="flex h-10 min-w-0 items-center gap-2 p-2">
      <div class="flex shrink-0 items-center gap-2">
        <HashIcon class="h-5 w-5 text-muted-foreground" stroke-width="2.5" />
        <div class="text-sm" @click="emit('more-details')">{{ chatTitle }}</div>
      </div>

      <div class="flex-1"></div>

      <div v-if="onlineUsers.length" class="flex min-w-0 items-center gap-2">
        <UserAvatarStack
          :users="onlineUsers"
          size="md"
          variant="mentionRow"
          :min="1"
          :overlap-px="8"
          class="min-w-0 w-20 justify-end"
        />
        <div class="h-2 w-2 shrink-0 rounded-full bg-green-400"></div>
        <div class="shrink-0 text-xs text-muted-foreground">{{ onlineUsers.length }} online</div>
      </div>

      <ButtonGroup class="ml-xl shrink-0">
        <Button
          size="icon"
          variant="outline"
          @click="emit('join-channel-meeting')"
          class="p-1 text-muted-foreground"
          title="Join meeting"
        >
          <HeadphonesIcon class="w-4 h-4" />
        </Button>

        <Menu type="dropdown-menu">
          <MenuTrigger as-child>
            <Button
              size="icon"
              variant="outline"
              class="p-1 text-muted-foreground"
              title="More meeting actions"
              aria-label="More meeting actions"
            >
              <ChevronDownIcon class="w-4 h-4" />
            </Button>
          </MenuTrigger>
          <MenuContent align="end" class="text-xs font-dmSans">
            <MenuItem @click="emit('start-meeting')">
              <HeadphonesIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
              <span>Start meeting</span>
            </MenuItem>
            <MenuItem @click="emit('schedule-meeting')">
              <CalendarClockIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
              <span>Schedule meeting</span>
            </MenuItem>
          </MenuContent>
        </Menu>
      </ButtonGroup>
    </div>

    <Separator />

    <div class="relative min-h-0">
      <ScrollArea class="min-h-0 h-full" ref="scrollAreaRef">
        <div class="flex:col-xl !flex justify-end p-4 min-h-full pb-14">
          <div
            class="w-full"
            :style="{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }"
          >
            <div ref="introEl" class="flex:col-3xl p-xl mb-2xl absolute left-0 right-0 top-0 z-[1]">
              <div class="flex:row-xl flex:center-y gap-2">
                <UserAvatar
                  v-for="member of channel.peers"
                  :key="member.id"
                  :name="member.name"
                  :picture="member.picture"
                  size="tileXl"
                  class="-ml-10 first:ml-0"
                />
              </div>
              <div class="text-xl text-accent-foreground font-lato">
                This is the begining of a conversation between
                <template v-for="(member, i) of channel.peers" :key="member.id">
                  <template v-if="i > 0 && i < channel.peers.length - 1">, </template>
                  <template v-else-if="i > 0"> and </template>
                  <span
                    class="inline-flex items-center"
                    :class="
                      member.id === meId
                        ? 'px-0.5 rounded-sm bg-mentionHighlight text-mentionHighlight-foreground font-medium'
                        : 'px-0.5 rounded-sm bg-mention-chip text-mention font-medium'
                    "
                  >
                    @{{ member.name }}
                  </span> </template
                >.
              </div>
            </div>

            <div
              v-for="virtualRow in rowVirtualizer.getVirtualItems()"
              :key="timelineRowKeyAt(virtualRow.index)"
              :data-index="virtualRow.index"
              :ref="measureTimelineRow"
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }"
            >
              <MessageGroup
                v-if="messageRow(virtualRow.index)"
                :sender="messageRow(virtualRow.index)!.group.sender"
                :meId="meId"
                :sentAt="messageRow(virtualRow.index)!.group.sentAt"
              >
                <slot
                  v-for="message of messageRow(virtualRow.index)!.group.messages"
                  :key="message.id"
                  name="message"
                  :message="message"
                  :me-id="meId"
                  :on-message-deleted="onMessageDeleted"
                  :on-quote="onQuote"
                  :on-start-edit="onStartEdit"
                />
              </MessageGroup>
              <ChannelActivityRow
                v-else-if="activityRow(virtualRow.index)"
                :activity="activityRow(virtualRow.index)!.activity"
                :channel-display-name="channel.name"
                :me-id="meId"
                :can-join-meeting="canJoinMeetingFromActivity(activityRow(virtualRow.index)!.activity)"
                :meeting-attendees="meetingAttendeesFromActivity(activityRow(virtualRow.index)!.activity)"
                @join-meeting="emit('join-meeting', $event)"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      <div v-if="typingPeerNames.length" class="absolute bottom-0 left-0 right-0 mx-7 z-[10]">
        <div
          class="px-2 py-1 border border-b-0 border-muted rounded-lg rounded-b-none text-xs bg-muted text-muted-foreground"
        >
          {{ typingBannerText }}
        </div>
      </div>
    </div>

    <slot
      name="composer"
      :quoted-message="quotedMessage"
      :editing-message="editingMessage"
      :on-send-message="onSendMessage"
      :on-send-scheduled-message="onSendScheduledMessage"
      :on-submit-edit="onSubmitEdit"
      :on-clear-quote="() => (quotedMessage = null)"
      :on-cancel-edit="onCancelEdit"
    />
  </div>
</template>

<style scoped>
.bg-green {
  background-color: #57ca4d;
}
</style>
